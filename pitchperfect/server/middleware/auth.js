// server/middleware/auth.js
//
// JWT verification middleware.
// Add this to any route that requires authentication.
// Usage: router.get('/protected', authMiddleware, handler)

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Token comes in Authorization header as "Bearer <token>"
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token using secret from .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request so routes can access it
        req.user = decoded; // { userId, email, name }

        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired — please login again' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authMiddleware;