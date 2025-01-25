const mongo = require('mongoose');

const cart = new mongo.Schema(
    {
       quantity:String,
       product:{type:mongo.Schema.Types.ObjectId,ref:'product'},
       user:{type:mongo.Schema.Types.ObjectId,ref:'reg'},
       amount:String
    }
);

const model = mongo.model('orders',cart);

module.exports = model;