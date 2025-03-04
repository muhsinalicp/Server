const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
dotenv.config();
const multer = require('multer');
const Login = require('../models/log');
const Seller = require('../models/seller');
const product = require('../models/product');
const authMiddleware = require('../middleware/authentication');
const jwt = require('jsonwebtoken');





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



// seller registeration
router.post('/sellersignup', upload.single('image'), async (req, res) => {
  try {
    console.log('seller signup: ', req.body);
    const { storeName, storeDesc, phone, username, password } = req.body;
    if (!storeName || !storeDesc || !phone || !username || !password) {
      return res.json({ status: 'error', message: 'Please fill all the fields' })
    }
    if (!req.file) {
      return res.json({ status: 'error', message: 'Please upload an image' })
    }

    const imageurl = await uploadToS3(req.file);



    var sellerlog =
    {
      username: username,
      password: password,
      type: 'seller'
    };

    const sellog = new Login(sellerlog);
    await sellog.save();

    var sellerreg =
    {
      storeName: storeName,
      storeDesc: storeDesc,
      phone: phone,
      image: imageurl,
      login: sellog._id
    };


    const sellreg = new Seller(sellerreg);
    await sellreg.save();

    res.json({ 'status': 'success' })
  }
  catch (err) {
    console.log('error occured in /seller/sellersignup route :', err);
    return res.json({ status: 'error', message: err.message })
  }
});


// seller dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  const { token } = req.cookies;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const sellerid = decoded.id;
  const data = await Seller.findById(sellerid);
  res.json({ 'status': 'success', 'data': data });
});

//Product upload method
router.post('/submitproduct', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additionalImages', maxCount: 5 }]), async (req, res) => {
  try {

    const { productname, category, price, description } = req.body;
    const { token } = req.cookies;


    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decoded);

    const sellerid = decoded.id;


    // Validate required fields
    if (!productname || !category || !price || !description || !req.files) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required, including images.',
      });
    }


    // Extract images
    const mainImageUrl = await uploadToS3(req.files.image[0]);


    // Upload additional images if they exist
    const additionalImageUrls = req.files.additionalImages
      ? await Promise.all(req.files.additionalImages.map(uploadToS3))
      : [];


    const allImageUrls = [mainImageUrl, ...additionalImageUrls];

    const newProduct = {
      image: allImageUrls,
      category,
      productprice: price,
      productname: productname,
      description,
      sellerid
    };

    console.log(newProduct);


    await product.create(newProduct);

    res.status(200).json({ status: 'done', message: 'Product submitted successfully!' });
  } catch (error) {
    console.error('Error occurred while submitting product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error. Please try again later.',
    });
  }
});


// fetch all products filtered by seller
router.get('/products', authMiddleware, async (req, res) => 
{
  try {
    const decodedSeller = req.user

    const sellerid = decodedSeller.id


    if (!sellerid) {
      return res.status(401).json({ status: 'error', message: 'Please login first or seller not found' })
    }


    const data = await product.find({ sellerid: sellerid });
  
    res.json({ 'status': 'success', 'data': data });
  }
  catch (err) {
    console.log('error occured in /seller/products route :', err);
    return res.status(500).json({ status: 'error occured, try again ', message: err.message })
  }
})






module.exports = router