const express   = require('express');
const router    = express.Router();
const reg       = require('../models/reg');
const log       = require('../models/log');
const complaint = require('../models/comp');
const seller    = require('../models/seller');
const product   = require('../models/product');
const order     = require('../models/order');




router.get('/',(req,res)=>
{
    res.send('hello from admin page')
})

router.get('/viewcomplaint',async(req,res)=>
{
    const data = await complaint.find().populate('regref');
    
    res.render('viewreply',{data:data});
    
});

router.get('/reply/:id',async(req,res)=>
{
    const id = req.params.id;
    const data = await complaint.findOne({_id:id});
    res.render('reply',{data:data});
});

router.post('/reply',async(req,res)=>
{
    const id = req.body.id;
    const reply = req.body.reply;

    await complaint.findOneAndUpdate(
        {_id:id},
        {$set:{reply:reply}},
        {new:true})
    
    res.render('repsucc');
});



module.exports = router;

