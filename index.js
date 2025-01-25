const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const port = process.env.PORT || 3000;
const db = require("./config/db");
db();
const cors = require("cors");
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});