const mongo = require('mongoose');

const cart = new mongo.Schema({
    product:{type:mongo.Schema.Types.ObjectId,ref:'product'},
    user:{type:mongo.Schema.Types.ObjectId,ref:'reg'},
    amount: String,
    quantity:String
});

const model = mongo.model('cart',cart);

module.exports = model;