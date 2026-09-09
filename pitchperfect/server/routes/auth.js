// server/routes/auth.js
// Signup and login routes

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT token
function generateToken(user) {
    return jwt.sign(
        {
            userId: user._id,
            email: user.email,
            name: user.name,
        },
        process.env.JWT_SECRET || 'pitchperfect_super_secret_jwt_key_2026',
        { expiresIn: '7d' } // token valid for 7 days
    );
}

// ── POST /api/auth/signup ─────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user — password is hashed automatically by pre-save hook
        const user = new User({ name, email, password });
        await user.save();

        // Generate token
        const token = generateToken(user);

        console.log(`✅ New user signed up: ${email}`);

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });

    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user);

        console.log(`✅ User logged in: ${email}`);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/auth/me ──────────────────────────────────────
// Verify token and return current user info
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;