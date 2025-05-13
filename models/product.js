const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [String], // Array of image URLs or filenames
      default: [],
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String, // e.g. 'Shirts', 'Pants', 'Shoes'
      required: true,
    },
    sizes: {
      type: [String], // e.g. ['S', 'M', 'L', 'XL']
      default: [],
    },
    colors: {
      type: [String], // e.g. ['Black', 'Blue']
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    brand: {
      type: String,
      default: "Other",
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "seller",
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    sales: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    styleTips: {
      type: String,
      default: "",
    },
    features: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("product", productSchema);
module.exports = Product;
