const mongo = require('mongoose');


const product = new mongo.Schema(
    {
        image:[String],
        productprice:String,
        productname:String,
        description:String,
        sellerid:{type:mongo.Schema.Types.ObjectId,ref:'seller'}
    })

const model = mongo.model('product',product);

module.exports = model;