// server/routes/sessions.js  (Phase 6)
// Added: GET /api/sessions/:id/report

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Session = require('../models/Session');
const auth = require('../middleware/auth');

const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

// ── POST /api/sessions ────────────────────────────────────
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        const { title, totalSlides } = req.body;

        if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
        if (!title) return res.status(400).json({ error: 'Title required' });

        const fileUrl = `/uploads/${req.file.filename}`;

        const session = new Session({
            user: req.user.userId,
            title,
            filename: req.file.filename,
            fileUrl,
            totalSlides: parseInt(totalSlides) || 0,
            status: 'created',
        });

        await session.save();
        res.status(201).json({ message: 'Session created', session });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/sessions ─────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const sessions = await Session.find({
            $or: [
                { user: req.user.userId },
                { user: { $exists: false } },
            ]
        })
            .sort({ createdAt: -1 })
            .select('title totalSlides status createdAt finalReport');
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/sessions/:id ─────────────────────────────────
router.get('/:id', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Not found' });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/sessions/:id/report ─────────────────────────
// Returns full session with slides + finalReport for the report page
router.get('/:id/report', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (session.status !== 'completed') {
            return res.status(400).json({ error: 'Session not completed yet' });
        }
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;