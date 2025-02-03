const jwt = require('jsonwebtoken');
const log = require('../models/log');

const authMiddleware = async (req, res, next) => {

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ 
            status: "error", 
            message: "Access denied. No token provided. Please log in." 
        });
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await log.findById(decoded.id);
            if (!req.user) {
                return res.status(401).json({ 
                    status: "error", 
                    message: "Invalid or expired token. Please log in again." 
                });
            }
            next();
        }
        catch (error) {
            res.status(401);
            return res.json({ status: 'error', message: 'Not authorized' });
        }
    }
}

module.exports = authMiddleware;