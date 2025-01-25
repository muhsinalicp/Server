const mongo = require('mongoose');


const reg = new mongo.Schema(
    {
        name:{type:String, required:true},
        phone:{type:String, required:true},
        email:{type:String, required:true},
        address:{type:String, required:true},
        image:{type:String, required:true},
        login:{type:mongo.Schema.Types.ObjectId,ref:'login',required:true}

    }
);

const models = mongo.model('reg',reg);

module.exports = models;

