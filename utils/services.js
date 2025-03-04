const Login = require('../models/log');
const jwt = require('jsonwebtoken');
const env = require('dotenv');


function generateToken(user)
{
     const payload =  
    {   
        id: user._id,
        type: user.type 
    }

    const secret = process.env.JWT_SECRET

    const token = jwt.sign(payload,secret,{expiresIn:'1d'})
    return token
}

module.exports = {generateToken}