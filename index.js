const express = require("express");
const app = express();
const env = require("dotenv").config();
const port = process.env.PORT || 3000;

const db = require("./config/db");
db();
const cors = require("cors");

app.use(cors({ origin: "*" }));

app.use(express.static("public"));

const adminroute = require('./routes/admin');
const userroute  = require('./routes/user');

app.use('/admin',adminroute);
app.use('/',userroute);


app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});