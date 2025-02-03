const mongo = require('mongoose');

const sellerSchema = new mongo.Schema({
    userId:{type:mongo.Schema.Types.ObjectId,ref:'login'} ,
    storeName:{type:String,required:true},
    storeDesc:{type:String,required:true},
    image:String,
    phone: String
  });

const model = mongo.model('seller',sellerSchema);

module.exports = model