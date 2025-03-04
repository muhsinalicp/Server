const express = require('express');
const path = require('path');
const db = require('../config/db');
const reg = require('../models/reg');
const log = require('../models/log');
const complaint = require('../models/comp');
const seller = require('../models/seller');
const product = require('../models/product');
const order = require('../models/order');
const cart = require('../models/cart')
const multer = require('multer');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const authMiddleware = require('../middleware/authentication');
const dotenv = require('dotenv');
const { generateToken } = require('../utils/services');
dotenv.config();

const router = express.Router();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadToS3 = async (file) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };


    try {
        const command = new PutObjectCommand(params);
        await s3.send(command);

        return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    } catch (err) {
        console.error('Error uploading to S3:', err);
        throw err;
    }
};

// user register 
router.post('/register', upload.single('image'), async (req, res) => {
    try {
        const schema = Joi.object(
            {
                username: Joi.string().min(3).max(30).required(),
                password: Joi.string().min(6).required(),
                name: Joi.string().min(2).required(),
                phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
                email: Joi.string().email().required(),
                address: Joi.string().min(5).required(),
            }
        );

        const { error } = schema.validate(req.body);
        if (error) {
            console.log(error);
            return res.status(400).json({ status: 'error', message: error.details[0].message });
        }

        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'Image is required' });
        }

        const existingUser = await log.findOne({ username: req.body.username });
        const existingEmail = await reg.findOne({ email: req.body.email });

        if (existingUser) {
            return res.status(400).json({ status: 'error', message: 'Username already exists' });
        }

        if (existingEmail) {
            return res.status(400).json({ status: 'error', message: 'Email already exists' });
        }

        const imgurl = await uploadToS3(req.file);

        const login = new log({
            username: req.body.username,
            password: req.body.password,
            type: 'user',
        });
        await login.save();

        const registration = new reg({
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email,
            address: req.body.address,
            image: imgurl,
            login: login._id,
        });
        await registration.save();

        res.status(201).json({ status: 'done', message: 'User registered successfully' });
    }
    catch (err) {
        console.error('Error in /register route:', err.message);
        res.status(500).json({ status: 'error', message: 'An internal server error occurred' });
    }
});

// login post 
router.post('/login_post', async (req, res) => {


    if (!req.body.username || !req.body.password) {
        return res.status(400).json({ 'status': "username or password is missing" });
    }

    console.log(req.body);

    try {

        const user = await log.findOne({ username: req.body.username, password: req.body.password });
        if (!user) {
            return res.status(404).json({ 'status': "user not found" });
        }

        const token = generateToken(user);
        console.log(token);
        

        if (token) {

            res.cookie('token', token, {
                secure: process.env.NODE_ENV === 'production', // Auto-switch between HTTP/HTTPS
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                httpOnly: true, // Always enable for security
                maxAge: 2 * 60 * 60 * 1000,
                path: '/',
                domain: process.env.NODE_ENV === 'production' 
                        ? '.onrender.com' // Your Render domain
                        : undefined
            });
            

            res.status(200).json(
                {
                    status: "login successful",
                    userType: user.type,
                });

        }


    }

    catch (err) {
        console.error('Error in /login_post route:', err.message);
        res.status(500).json({ status: 'error', message: 'An internal server error occurred' });
    }
});

// fetch all products 
router.get('/home', async (req, res) => {
    const data = await product.find();

    res.json({ data })
});

// dynamic fetching of product 
router.get('/product/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).json({ status: 'error', message: 'Product ID is required' });
    }
    try {
        const data = await product.findOne({ _id: id });
        if (!data) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        res.json({ data });
    }
    catch (err) {
        console.error('Error in /product/:id route:', err.message);
        res.status(500).json({ status: 'error', message: 'An internal server error occurred' });
    }
});

router.post('/logout', (req, res) => {
    try {
        res.clearCookie('token');
        console.log('Session destroyed and cookie cleared');

        return res.json({ status: 'success', message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Error logging out:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
});



//view details

//view complaints

//post complaints

//view replies

//view order

//delete order

//add to cart

//show cart

//purchase from cart

//delete from cart


module.exports = router;