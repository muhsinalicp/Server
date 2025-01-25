const mongo = require('mongoose');

const comp = new mongo.Schema(
    {
        date:{type:Date,required:true},
        complaint:{type:String,required:true},
        status:{type:String,required:true},
        reply:String,
        regref:{type:mongo.Schema.Types.ObjectId,ref:'reg'}

    }
);

const model = mongo.model('complaint',comp);

module.exports = model;