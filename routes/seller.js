const express = require("express");
const router = express.Router();
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
dotenv.config();
const multer = require("multer");
const Login = require("../models/log");
const Seller = require("../models/seller");
const Product = require("../models/product");
const authMiddleware = require("../middleware/authentication");
const jwt = require("jsonwebtoken");

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

const deleteImage = async (imageUrl) => {
  try {
    // If imageUrl is the full URL (e.g., "https://bucket-name.s3.region.amazonaws.com/uploads/123456_file.png"),
    // extract the key (the part after the domain).
    const url = new URL(imageUrl);
    // url.pathname will be like "/uploads/123456_file.png", so we remove the leading slash:
    const key = url.pathname.substring(1);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3.send(command);
  } catch (e) {
    console.log("Error in deleteImage function:", e);
  }
};

// seller registeration
router.post("/sellersignup", upload.single("image"), async (req, res) => {
  try {
    console.log("seller signup: ", req.body);
    const { storeName, storeDesc, phone, username, password } = req.body;
    if (!storeName || !storeDesc || !phone || !username || !password) {
      return res.json({
        status: "error",
        message: "Please fill all the fields",
      });
    }
    if (!req.file) {
      return res.json({ status: "error", message: "Please upload an image" });
    }

    const imageurl = await uploadToS3(req.file);

    var sellerlog = {
      username: username,
      password: password,
      type: "seller",
    };

    const sellog = new Login(sellerlog);
    await sellog.save();

    var sellerreg = {
      storeName: storeName,
      storeDesc: storeDesc,
      phone: phone,
      image: imageurl,
      login: sellog._id,
    };

    const sellreg = new Seller(sellerreg);
    await sellreg.save();

    res.json({ status: "success" });
  } catch (err) {
    console.log("error occured in /seller/sellersignup route :", err);
    return res.json({ status: "error", message: err.message });
  }
});

// seller dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
  const data = req.user;
  res.json({ status: "success", data: data });
});

//Product upload method
router.post(
  "/submitproduct",
  authMiddleware,
  upload.fields([
    { name: "mainimage", maxCount: 1 },
    { name: "additionalImages", maxCount: 4 },
  ]),
  async (req, res) => {
    try {
      const sellerid = req.user.id;

      const seller = await Login.findById(sellerid);
      if (!seller.type === "seller") {
        return res.status(404).json({
          status: "error",
          message: "Seller not found",
        });
      }

      const {
        productname,
        category,
        price,
        description,
        brand,
        colors,
        sizes,
        stock,
        styleTips,
        features,
      } = req.body;

      // Validate required fields
      if (
        !productname ||
        !category ||
        !price ||
        !description ||
        !brand ||
        !colors ||
        !sizes ||
        !stock ||
        !req.files ||
        !styleTips ||
        !features
      ) {
        return res.status(400).json({
          status: "error",
          message: "All fields are required, including images.",
        });
      }

      // Extract images
      const mainImageUrl = await uploadToS3(req.files.mainimage[0]);

      // Upload additional images if they exist
      const additionalImageUrls = req.files.additionalImages
        ? await Promise.all(req.files.additionalImages.map(uploadToS3))
        : [];

      const allImageUrls = [mainImageUrl, ...additionalImageUrls];

      const newProduct = {
        images: allImageUrls,
        category,
        price,
        name: productname,
        description,
        brand,
        colors: colors.split(","),
        sizes: sizes.split(","),
        stock,
        sellerId: sellerid,
        styleTips,
        features,
      };

      await Product.create(newProduct);

      res
        .status(200)
        .json({ status: "done", message: "Product submitted successfully!" });
    } catch (error) {
      console.error("Error occurred while submitting product:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error. Please try again later.",
      });
    }
  }
);

// delete product
router.delete("/deleteproduct/:id", authMiddleware, async (req, res) => {
  try {
    const productid = req.params.id;
    const sellerid = req.user.id;

    const seller = await Login.findById(sellerid);

    if (!seller.type === "seller") {
      return res.status(404).json({
        status: "error",
        message: "Seller not found",
      });
    }

    const product = await Product.findById(productid);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }

    if (product.sellerId.toString() !== sellerid) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to delete this product",
      });
    }

    const image = product.images;

    for (let i = 0; i < image.length; i++) {
      const imageurl = image[i];
      await deleteImage(imageurl);
    }

    await Product.findByIdAndDelete(productid);

    res.json({ status: "success", message: "Product deleted successfully" });
  } catch (error) {
    console.log("error occured in /seller/deleteproduct/:id route :", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error. Please try again later.",
    });
  }
});

// fetch all products filtered by seller
router.get("/products", authMiddleware, async (req, res) => {
  try {
    const decodedSeller = req.user;

    const sellerid = decodedSeller.id;

    if (!sellerid) {
      return res.status(401).json({
        status: "error",
        message: "Please login first or seller not found",
      });
    }

    const data = await Product.find({ sellerId: sellerid }).sort({
      createdAt: -1,
    });

    res.json({ status: "success", data: data });
  } catch (err) {
    console.log("error occured in /seller/products route :", err);
    return res
      .status(500)
      .json({ status: "error occured, try again ", message: err.message });
  }
});

//view seller details

//recievedorders

module.exports = router;
