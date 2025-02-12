const mongo = require('mongoose');
const env = require('dotenv');

env.config();

const mongourl = process.env.MONGO_URL;

const db = async()=>
{
    return await mongo.connect(mongourl).then(()=>
    {
        console.log('Mongo DB connected');
    }).catch((err)=>
    {
        console.log(err);
    })
}

module.exports = db;
