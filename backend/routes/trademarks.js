const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

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

module.exports = router;
