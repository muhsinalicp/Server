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
// app.use(cors({ origin: "*" , credentials: true }));

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));

app.use(express.static("public"));

const adminroute = require('./routes/admin');
const userroute  = require('./routes/user');
const sellerroute = require('./routes/seller');

app.use('/',userroute);
app.use('/admin',adminroute);
app.use('/seller',sellerroute);



app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});