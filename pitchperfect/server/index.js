// server/index.js  (Phase 7)
// Added auth routes and JWT_SECRET to .env

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const CLIENT_URL = rawClientUrl.replace(/\/+$/, '');

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (
            cleanOrigin === CLIENT_URL ||
            cleanOrigin.endsWith('.vercel.app') ||
            cleanOrigin.includes('localhost')
        ) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
};

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 5e6,
});

app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded PDFs
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || CLIENT_URL);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');

app.use('/api/auth', authRoutes);    // ← NEW
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Socket.io ────────────────────────────────────────────
const registerSocketHandlers = require('./socket/handlers');
registerSocketHandlers(io);

// ── Start ────────────────────────────────────────────────
if (process.env.MONGO_URI) {
    mongoose
        .connect(process.env.MONGO_URI)
        .then(() => {
            console.log('✅ MongoDB connected');
            httpServer.listen(process.env.PORT || 5000, () => {
                console.log(`✅ Server + Socket.io running on port ${process.env.PORT || 5000}`);
            });
        })
        .catch((err) => {
            console.error('❌ MongoDB error:', err.message);
        });
}

module.exports = app;