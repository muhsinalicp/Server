const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const path = require("path");
const db = require("../config/db");
const reg = require("../models/reg");
const log = require("../models/log");
const complaint = require("../models/comp");
const seller = require("../models/seller");
const Product = require("../models/product");
const Review = require("../models/review");
const order = require("../models/order");
const cart = require("../models/cart");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const authMiddleware = require("../middleware/authentication");
const { generateToken } = require("../utils/services");

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
    console.error("Error uploading to S3:", err);
    throw err;
  }
};

// user register
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const schema = Joi.object({
      username: Joi.string().min(3).max(30).required(),
      password: Joi.string().min(6).required(),
      name: Joi.string().min(2).required(),
      phone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required(),
      email: Joi.string().email().required(),
      address: Joi.string().min(5).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      console.log(error);
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "Image is required" });
    }

    const existingUser = await log.findOne({ username: req.body.username });
    const existingEmail = await reg.findOne({ email: req.body.email });

    if (existingUser) {
      return res
        .status(400)
        .json({ status: "error", message: "Username already exists" });
    }

    if (existingEmail) {
      return res
        .status(400)
        .json({ status: "error", message: "Email already exists" });
    }

    const imgurl = await uploadToS3(req.file);

    const login = new log({
      username: req.body.username,
      password: req.body.password,
      type: "user",
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

    res
      .status(201)
      .json({ status: "done", message: "User registered successfully" });
  } catch (err) {
    console.error("Error in /register route:", err.message);
    res
      .status(500)
      .json({ status: "error", message: "An internal server error occurred" });
  }
});

// login post
router.post("/login_post", async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ status: "username or password is missing" });
  }

  // console.log(req.body);

  try {
    const user = await log.findOne({
      username: req.body.username,
      password: req.body.password,
    });
    if (!user) {
      return res.status(404).json({ status: "user not found" });
    }

    const token = generateToken(user);
    // console.log("token:",token);

    if (token) {
      res.status(200).json({
        status: "login successful",
        userType: user.type,
        token: token,
      });
    }
  } catch (err) {
    console.error("Error in /login_post route:", err.message);
    res
      .status(500)
      .json({ status: "error", message: "An internal server error occurred" });
  }
});

// fetch all products
router.get("/home", async (req, res) => {
  const data = await Product.find();

  res.json({ data });
});

// new arrivals (4 products)
router.get("/newarrivals", async (req, res) => {
  const data = await Product.find().sort({ createdAt: -1 }).limit(4);
  res.json({ data });
});

// best sellers (4 products)
router.get("/bestsellers", async (req, res) => {
  const data = await Product.find().sort({ sales: -1 }).limit(4);
  res.json({ data });
});

// dynamic fetching of Product
router.get("/product/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res
      .status(400)
      .json({ status: "error", message: "Product ID is required" });
  }
  try {
    const data = await Product.findOne({ _id: id });
    if (!data) {
      return res
        .status(404)
        .json({ status: "error", message: "Product not found" });
    }

    res.json({ data });
  } catch (err) {
    console.error("Error in /product/:id route:", err.message);
    res
      .status(500)
      .json({ status: "error", message: "An internal server error occurred" });
  }
});

//get product by category
router.get("/products/:category", async (req, res) => {
  const category = req.params.category;
  try {
    if (category) {
      const data = await Product.find({ category: category }).limit(4);
      res.json({ data });
    } else {
      const data = await Product.find().limit(4);
      res.json({ data });
    }
  } catch (err) {
    console.error("Error in /products/:category route:", err.message);
    res
      .status(500)
      .json({ status: "error", message: "An internal server error occurred" });
  }
});

//post reviews and ratings
router.post("/reviews", authMiddleware, async (req, res) => {
  const { productId, rating, review } = req.body;
  const { _id } = req.user;

  if (!rating || !review) {
    return res
      .status(400)
      .json({ status: "error", message: "All fields are required" });
  }

  if (rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ status: "error", message: "Rating must be between 1 and 5" });
  }

  if (review.length < 10) {
    return res.status(400).json({
      status: "error",
      message: "Review must be at least 10 characters",
    });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ status: "error", message: "Product not found" });
    }

    let totalRating = product.rating + Number(rating);
    // console.log("avgRating:", avgRating);
    let totalReviews = product.numReviews + 1;
    // console.log("totalReviews:", totalReviews);
    let avgRating = (totalRating / totalReviews).toFixed(1);
    // console.log("avgRating:", avgRating);

    await Product.findByIdAndUpdate(productId, {
      rating: totalRating,
      numReviews: totalReviews,
      avgRating: avgRating,
    });

    const newReview = {
      productId,
      rating: Number(rating),
      review,
      userId: _id,
    };
    0;

    await Review.create(newReview);

    return res.json({
      status: "success",
      message: "Review posted successfully",
    });
  } catch (error) {
    console.log("error in /reviews route:", error);
    return res
      .status(500)
      .json({ status: "error", message: "An internal server error occurred" });
  }
});

//get reviews by product id
router.get("/reviews/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res
        .status(400)
        .json({ status: "error", message: "Product ID is required" });
    }

    const reviews = await Review.find({ productId: id })
      .populate("userId")
      .sort({ createdAt: -1 });

    const data = reviews.map((review) => ({
      _id: review._id,
      rating: review.rating,
      review: review.review,
      username: review.userId.username,
      postedAt: review.createdAt,
    }));

    res.json({ data });
  } catch (error) {
    console.log("error in /reviews/:id route:", error);
    return res
      .status(500)
      .json({ status: "error", message: "An internal server error occurred" });
  }
});

//get reviews by user id

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

// logout
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token");
    console.log("Session destroyed and cookie cleared");

    return res.json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
