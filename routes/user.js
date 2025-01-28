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
const Joi = require('joi');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
dotenv.config();
const router = express.Router();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

const storage = multer.memoryStorage(); // Store files in memory buffer temporarily
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


router.post('/upload', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file provided' });
      }
  
      // Upload to S3
      const fileUrl = await uploadToS3(req.file);
  
      // Example response
      res.json({ status: 'success', fileUrl });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'File upload failed', error: err.message });
    }
  });


router.post('/register', upload.single('image'), async (req, res) => {
try
{
    const schema = Joi.object({
        username: Joi.string().min(3).max(30).required(),
        password: Joi.string().min(6).required(),
        name: Joi.string().min(2).required(),
        phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
        email: Joi.string().email().required(),
        address: Joi.string().min(5).required(),
      });

      const { error } = schema.validate(req.body);
      if (error) {
        console.log(error);
        return res.status(400).json({ status: 'error', message: error.details[0].message });
      }

      if (!req.file) {
        console.log('lll');
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
catch(err)
{
    console.error('Error in /register route:', err.message);
    res.status(500).json({ status: 'error', message: 'An internal server error occurred' });
}
});

router.post('/login_post', async (req, res) => {

    if (!req.body.username || !req.body.password) {
        return res.status(400).json({ 'status': "username or password is missing" });
    }

    try {
        const username = req.body.username;
        const password = req.body.password;
    
        const data = await log.findOne({ username: username, password: password });
    
        if (!data) {
           return res.json({ 'status': "nouserfound" });
        }
        else if (data.type == 'user') {
           return res.status(200).json({ 'status': "okuser", "lid": data._id });
    
        }
        else if (data.type == 'seller') {
           return res.status(200).json({ 'status': "okseller", 'lid': data._id });
    
        }
        else {
           return res.status(200).json({ 'status': "no" });
    
        }
    }
    catch (err) 
    { 
        console.log("Error in /login_post Route",err);
        res.json({ 'status': "error" , 'message': err }); 
    }
});

router.get('/home', async (req, res) => {
    const data = await product.find();
    res.json({ "data": data })
});

router.get('/view', async (req, res) => {
    const lid = req.query.lid;

    const data = await reg.findOne({ login: lid })

    // res.render('view',{a:data});
    res.json({ 'data': data })
});

router.get('/complaint', async (req, res) => {
    const lid = req.query.lid;

    const data = await reg.findOne({ login: lid })
    console.log(data);


    res.json({ 'data': data })


    // const data = await reg.findOne({login:req.session.lid});
    // res.render('complaint');
});

router.post('/complaint', async (req, res) => {
    const compl = req.body.complaint;
    const date = req.body.date;

    const register = await reg.findOne({ login: req.session.lid })

    var data =
    {
        complaint: compl,
        date: date,
        regref: register._id,
        status: 'pending',
        reply: 'pending'
    }

    const col = new complaint(data);
    await col.save();

    res.render('succ')
});

router.get('/viewreply', async (req, res) => {

    const lid = req.query.lid;

    const logi = await reg.findOne({ login: lid })
    const data = await complaint.findOne({ regref: logi._id })

    res.json({ 'data': data })


    // const u=await reg.findOne({login:req.session.lid});
    // const data = await complaint.findOne({regref:u._id});
    // res.render('userview',{data:data});
});

router.get('/seller', async (req, res) => 
{

    const lid = req.query.lid;

    const data = await reg.findOne({login:lid})

    res.json({'data':data , 'status':'done'});
    

    // const data = await reg.findOne({ login: req.session.lid });
    // console.log(data);
    // res.render('regsell', { data: data });
});

router.post('/seller', async (req, res) => {

    

    var sellerlog =
    {
        username: req.body.username,
        password: req.body.password,
        type: 'seller'
    };

    const sellog = new log(sellerlog);
    await sellog.save();

    var sellerreg =
    {
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
        image: req.body.image,
        login: sellog._id
    };

    console.log(sellerreg);


    const sellreg = new seller(sellerreg);
    await sellreg.save();


    res.json({'status':'success'})
    // res.redirect('/user/login');

});

router.get('/sellerhome', async (req, res) => {

    const lid = req.query.lid

    const sid = await seller.findOne({login:lid});
    const data = await product.find({sellerid:sid._id})

    res.json({'data':data})
    


    // const sid = await seller.findOne({ login: req.session.lid });
    // const data = await product.find({ sellerid: sid._id });
    // res.render('sellerhome', { data: data });
});

// router.get('/addproduct', (req, res) => {
//     res.render('addprod');
// });

router.get('/sellerprofile', async (req, res) => {
    const lid = req.query.lid;

    const data = await seller.findOne({ login: lid });

    res.json({ 'data': data })
    // const data = await seller.findOne({login:req.session.lid});
    // res.render('view',{a:data});
});

router.post('/submitproduct', upload.array('productImage', 6), async (req, res) => {
    try {
      // Validate required fields
      const { lid, productname, price, description } = req.body;
  
      if (!lid || !productname || !price || !description || !req.files) {
        return res.status(400).json({
          status: 'error',
          message: 'All fields are required, including images.',
        });
      }
  
      // Find the seller
      const ref = await seller.findOne({ login: lid });
  
      if (!ref) {
        return res.status(404).json({
          status: 'error',
          message: 'Seller not found.',
        });
      }
  
      // Upload files to S3
      const uploadToS3 = (file) => {
        const fileKey = `${uuidv4()}-${file.originalname}`; // Generate unique file name
        const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME, // Your bucket name
          Key: fileKey,
          Body: file.buffer, // Use file buffer for upload
          ContentType: file.mimetype,
          ACL: 'public-read', // Make file publicly accessible
        };
  
        return s3.upload(params).promise(); // Return a promise
      };
  
      const imageUploadPromises = req.files.map(uploadToS3);
      const uploadedImages = await Promise.all(imageUploadPromises);
  
      // Extract URLs of uploaded images
      const imageUrls = uploadedImages.map((img) => img.Location);
  
      // Create product object
      const item = {
        image: imageUrls,
        productprice: price,
        productname: productname,
        description: description,
        sellerid: ref._id,
      };
  
      // Save product to the database
      const model = new product(item);
      await model.save();
  
      res.status(200).json({ status: 'done', message: 'Product submitted successfully!' });
    } catch (error) {
      console.error('Error occurred while submitting product:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error. Please try again later.',
      });
    }
  });

router.get('/delete/:id', async (req, res) => {
    const id = req.params.id;
    await product.findOneAndDelete(
        { _id: id });

    res.render('delsucc');
})

router.get('/edit', async (req, res) => {


    const id = req.query.id;

    console.log(id);
    
    
    const data = await product.findOne({_id:id})
    

    res.json({'data':data})
    


    
    // const id = req.params.id;
    // const data = await product.findOne({ _id: id })
    // console.log(data);
    // res.render('edprod', { a: data });
});

router.post('/editproduct', upload.single('productImage'), async (req, res) => {
    const image = req.file.filename;
    const pname = req.body.productName;
    const pprice = req.body.price;
    const description = req.body.description;
    const id = req.body.id;

    var item =
    {
        image: image,
        productprice: pprice,
        productname: pname,
        description: description,
    };

    await product.findOneAndUpdate(
        { _id: id },
        { $set: item },
        { new: true }
    )

    res.render('edsucc');


});

router.post('/purchase', async (req, res) => {
    const id = req.body.id;
    const quantity = req.body.quantity;

    const prod = await product.findOne({ _id: id });
    const userr = await reg.findOne({ login: req.session.lid });


    const total = prod.productprice * quantity


    var item =
    {
        quantity: quantity,
        product: prod._id,
        user: userr._id,
        amount: total
    }

    const ord = new order(item)
    await ord.save();

    res.send('success');

});

router.get('/vieworder', async (req, res) => {
    const rid = await reg.findOne({ login: req.session.lid })
    const data = await order.find({ user: rid._id }).populate('user').populate('product');
    res.render('vieworder', { data: data });
});

router.get('/deleteorder/:id', async (req, res) => {
    const id = req.params.id;
    await order.findOneAndDelete({ _id: id })
    res.render('delsucc');
});

router.get('/recievedorders', async (req, res) => {
    const sid = await seller.findOne({ login: req.session.lid });
    const hii = await product.find({ sellerid: sid._id })

    const aaa = await order.find({ product: hii._id }).populate('product');
    console.log(aaa);

    const hello = hii.map(prod => prod._id);
    const data = await order.find({ product: { $in: hello } }).populate('product')

    res.render('record', { data: data })
});

router.post('/addcart', async (req, res) => {
    const id = req.body.id;
    const quantity = req.body.quantity;

    const prod = await product.findOne({ _id: id });
    const userr = await reg.findOne({ login: req.session.lid });

    console.log(userr);

    var item =
    {
        product: prod._id,
        user: userr._id,
        quantity: quantity,
        amount: prod.productprice * quantity
    };

    const car = new cart(item);
    await car.save()
    res.redirect('/user/home');
});

router.get('/showcart', async (req, res) => {

    const regg = await reg.findOne({ login: req.session.lid });
    const caaaa = await cart.find({ user: regg._id }).populate('product');

    const totall = await cart.find({ user: regg._id })
    var toootal = 0;

    for (i in totall) {
        // console.log(totall[i].amount);
        toootal += Number(totall[i].amount);
        // console.log(toootal);

    };



    res.render('cartss', { data: caaaa, total: toootal });
});

router.post('/cartpurchase', async (req, res) => {

    const regg = await reg.findOne({ login: req.session.lid });
    const caaaa = await cart.find({ user: regg._id }).populate('product');

    console.log(caaaa);

    for (i in caaaa) {
        var item =
        {
            quantity: caaaa[i].quantity,
            product: caaaa[i].product._id,
            user: regg._id,
            amount: caaaa[i].amount
        }

        const ord = new order(item)
        await ord.save();

    }
    await cart.deleteMany({ user: regg._id });


    res.render("ordsucc");

})

router.get('/cartdelete/:id', async (req, res) => {
    const id = req.params.id;

    await cart.findOneAndDelete({ _id: id })
    res.redirect('/user/showcart')
})
module.exports = router;