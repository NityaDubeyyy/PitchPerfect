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

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 5e6,
});

// ── CORS must come BEFORE static file serving ──────────
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json());

// ── Serve uploaded PDFs with explicit headers ──────────
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
const sessionRoutes = require('./routes/sessions');
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Socket.io
const registerSocketHandlers = require('./socket/handlers');
registerSocketHandlers(io);

// Start
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');

        const PORT = process.env.PORT || 5000;

        httpServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\n❌ Port ${PORT} is already in use.`);
                console.error(`   Run this to free it:\n`);
                console.error(`   Get-NetTCPConnection -LocalPort ${PORT} -State Listen | Select-Object -ExpandProperty OwningProcess | ForEach-Object { taskkill /PID $_ /F }\n`);
                process.exit(1);
            } else {
                throw err;
            }
        });

        httpServer.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB error:', err.message);
        process.exit(1);
    });