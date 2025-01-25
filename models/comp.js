const { status } = require('init');
const mongo = require('mongoose');

const comp = new mongo.Schema(
    {
        date:String,
        complaint:String,
        status:String,
        reply:String,
        regref:{type:mongo.Schema.Types.ObjectId,ref:'reg'}

    }
);

const model = mongo.model('complaint',comp);

module.exports = model;