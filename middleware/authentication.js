const jwt = require('jsonwebtoken');
const log = require('../models/log');

const authMiddleware = async (req, res, next) => 
{
    let token = req.headers.authorization?.split(' ')[1] || req.query.token;

    if (token)
    {
        try
        {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await log.findById(decoded.id);
            next();
        }
        catch (error)
        {
            res.status(401);
            return res.json({ status: 'error', message: 'Not authorized' });
        }
    }
}

module.exports = authMiddleware;