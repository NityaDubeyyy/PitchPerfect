const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' })); // React dev server
app.use(express.json());

// Serve uploaded PDFs as static files so React can load them
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────────
const sessionRoutes = require('./routes/sessions');
app.use('/api/sessions', sessionRoutes);

// ── Health check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PitchPerfect server running' });
});

// ── MongoDB connection ───────────────────────────────────
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(process.env.PORT || 5000, () => {
            console.log(`✅ Server running on port ${process.env.PORT || 5000}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });