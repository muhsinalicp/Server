const jwt = require('jsonwebtoken');
const Login = require('../models/log');

const authMiddleware = async (req, res, next) => {

    const {token} = req.cookies;
    console.log(req.cookies);
    
    

    if (!token) {
        console.log("Token isn't provided....");
        
        return res.status(401).json({ 
            status: "error", 
            message: "Access denied. No token provided. Please log in." 
        });
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await Login.findById(decoded.id);
            if (!req.user) {
                console.log("User not found....");
                return res.status(401).json({ 
                    status: "error", 
                    message: "Invalid or expired token. Please log in again." 
                });
            }
            console.log('User authenticated...');
            
            next();
        }
        catch (error) {
            res.status(401);
            return res.json({ status: 'error', message: 'Not authorized' });
        }
    }
}

module.exports = authMiddleware;