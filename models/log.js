const mongo = require('mongoose');


const log = new mongo.Schema(
    {
        username:String,
        password:String,
        type:String
    }
);

const models = mongo.model('login',log);

module.exports = models;