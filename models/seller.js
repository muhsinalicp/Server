const mongo = require('mongoose');

const seller = new mongo.Schema({
    name:String,
    phone:String,
    email:String,
    address:String,
    image:String,
    login:{type:mongo.Schema.Types.ObjectId,ref:'login'}
});

const model = mongo.model('seller',seller);

module.exports = model