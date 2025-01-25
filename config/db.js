const mongo = require('mongoose');
const env = require('dotenv');

env.config();

const mongourl = process.env.MONGO_URL;

const db = async()=>
{
    const a = await mongo.connect(mongourl);
    console.log('MongoDB Connected');
}

module.exports = db;
