const express = require("express");
const app = express();
const env = require("dotenv").config();
const port = process.env.PORT || 3000;
const cookieParser = require("cookie-parser");
const db = require("./config/db");

db();
const cors = require("cors");

app.use(cookieParser());
app.use(express.json());

app.use(cors({
    origin: "https://cart-hive.netlify.app",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }));

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Expose-Headers", "Set-Cookie");
    next();
  });

app.use(express.static("public"));

const adminroute = require('./routes/admin');
const userroute  = require('./routes/user');
const sellerroute = require('./routes/seller');

app.use('/',userroute);
app.use('/admin',adminroute);
app.use('/seller',sellerroute);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});