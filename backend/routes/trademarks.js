const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

dotenv.config();

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB hard limit on raw upload
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Ensure uploads dir exists at boot (best-effort, non-blocking)
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            return cb(new Error('Unsupported image type. Allowed: JPEG, PNG, GIF, WEBP.'));
        }
        cb(null, true);
    }
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many uploads. Please slow down.' }
});

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
}).promise();

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Resolve a stored logo_url (e.g. "/uploads/foo.webp") to an absolute path
// inside UPLOADS_DIR. Returns null if the path escapes the directory.
const resolveLogoPath = (logoUrl) => {
    if (!logoUrl || typeof logoUrl !== 'string') return null;
    const filename = path.basename(logoUrl);
    const abs = path.resolve(UPLOADS_DIR, filename);
    if (!abs.startsWith(UPLOADS_DIR + path.sep)) return null;
    return abs;
};

const safeUnlink = async (absPath) => {
    if (!absPath) return;
    try { await fs.unlink(absPath); } catch (_) { /* ignore */ }
};

// ---------- CRUD ----------

router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM trademarks ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM trademarks WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Trademark not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', auth, async (req, res) => {
    const { trademark_name, client_name, application_number, registration_number, status, class_number, expiry_date } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO trademarks (trademark_name, client_name, application_number, registration_number, status, class_number, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [trademark_name, client_name, application_number, registration_number, status || 'Pending', class_number, expiry_date]
        );
        res.status(201).json({ id: result.insertId, message: 'Trademark created successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:id', auth, async (req, res) => {
    const { trademark_name, client_name, application_number, registration_number, status, class_number, expiry_date } = req.body;
    try {
        await db.execute(
            'UPDATE trademarks SET trademark_name=?, client_name=?, application_number=?, registration_number=?, status=?, class_number=?, expiry_date=? WHERE id=?',
            [trademark_name, client_name, application_number, registration_number, status, class_number, expiry_date, req.params.id]
        );
        res.json({ message: 'Trademark updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT logo_url FROM trademarks WHERE id = ?', [req.params.id]);
        await db.execute('DELETE FROM trademarks WHERE id = ?', [req.params.id]);
        if (rows[0]?.logo_url) await safeUnlink(resolveLogoPath(rows[0].logo_url));
        res.json({ message: 'Trademark deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ---------- Logo upload ----------

router.post(
    '/:id/upload-logo',
    auth,
    uploadLimiter,
    (req, res, next) => {
        upload.single('logo')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ message: 'Image is larger than 5MB.' });
                }
                return res.status(400).json({ message: err.message });
            }
            if (err) return res.status(400).json({ message: err.message });
            next();
        });
    },
    async (req, res) => {
        if (!req.file) return res.status(400).json({ message: 'No image provided.' });

        let writtenPath = null;
        try {
            // 1. Verify the trademark exists and capture old logo for cleanup
            const [rows] = await db.execute(
                'SELECT logo_url FROM trademarks WHERE id = ?',
                [req.params.id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Trademark not found.' });
            }
            const oldLogoPath = resolveLogoPath(rows[0].logo_url);

            // 2. Validate + normalize via sharp (also rejects non-image bytes)
            const pipeline = sharp(req.file.buffer, { failOn: 'error' });
            const meta = await pipeline.metadata();
            if (!meta.format) {
                return res.status(400).json({ message: 'File is not a valid image.' });
            }

            // 3. Resize to a sensible logo size and re-encode as webp
            const filename = `tm-${req.params.id}-${crypto.randomBytes(8).toString('hex')}.webp`;
            writtenPath = path.join(UPLOADS_DIR, filename);
            await pipeline
                .rotate() // honor EXIF orientation
                .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toFile(writtenPath);

            const logoUrl = `/uploads/${filename}`;

            // 4. Persist URL; if DB write fails, remove the new file we just wrote
            try {
                await db.execute(
                    'UPDATE trademarks SET logo_url = ? WHERE id = ?',
                    [logoUrl, req.params.id]
                );
            } catch (dbErr) {
                await safeUnlink(writtenPath);
                throw dbErr;
            }

            // 5. Best-effort delete of the previous logo
            if (oldLogoPath && oldLogoPath !== writtenPath) await safeUnlink(oldLogoPath);

            res.json({ message: 'Logo uploaded successfully', logo_url: logoUrl });
        } catch (err) {
            console.error('[upload-logo]', err);
            await safeUnlink(writtenPath);
            res.status(500).json({ message: 'Server error during upload.' });
        }
    }
);

router.delete('/:id/logo', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT logo_url FROM trademarks WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Trademark not found.' });

        const oldLogoPath = resolveLogoPath(rows[0].logo_url);
        await db.execute('UPDATE trademarks SET logo_url = NULL WHERE id = ?', [req.params.id]);
        await safeUnlink(oldLogoPath);

        res.json({ message: 'Logo removed.' });
    } catch (err) {
        console.error('[delete-logo]', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
