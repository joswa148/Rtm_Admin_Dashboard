const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
    }
});

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
}).promise();

// Middleware to verify JWT
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// GET all trademarks
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM trademarks ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET single trademark
router.get('/:id', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM trademarks WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Trademark not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST create trademark
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

// PUT update trademark
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

// DELETE trademark
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('DELETE FROM trademarks WHERE id = ?', [req.params.id]);
        res.json({ message: 'Trademark deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST upload trademark logo
router.post('/:id/upload-logo', auth, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const logoUrl = `/uploads/${req.file.filename}`;
        
        // Update database
        await db.execute('UPDATE trademarks SET logo_url = ? WHERE id = ?', [logoUrl, req.params.id]);

        res.json({ 
            message: 'Logo uploaded successfully',
            logo_url: logoUrl 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;
