'use strict';

const mongoose = require('mongoose');
const ReminderSettings = require('../models/reminderSettings');
const ReminderInput = require('../models/reminderInout');
const customConfig = require('../config/customConfig');
mongoose.Promise = global.Promise;  
mongoose.connection.openUri("mongodb://localhost/socialB2B")
// const db = require('../lib/database'),
// crypto = require('../lib/crypto');
module.exports.remAdd = function(){

    let RealPrices = {
        site: "baidu",  //网站名称
        symbol: "btc#usd", //交易品种，如 "btc#usd"表示使用美元兑换比特币的交易品种
        bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]],   //array, 买单深度,已按照价格降序排列 数组索引(string) 0 价格, 1 量(张)
        asks: [[19100,1.03],[19105,0.98]]   //array,卖单深度,已按照价格升序排列 数组索引(string) 0 价格, 1 量(张)
      //timestamp: res.realPrice.time //long, 服务器时间戳

    }
    
    let RemindUser = {
        userId:1,
        site : 'baidu',
        symbol : "btc#usd",
        high : [1600],
        low : [1100],
        time : new Date()};
    
    // const RemindAdd = new ReminderSettings();
    // RemindAdd.save(function(err){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         console.log("ok")
    //     }
    // })
    
    ReminderSettings.create(RemindUser,function(err){
        if(err){
            console.log(err);
        }
        console.log("ok")
    })
   
    console.log('12');
                    
}


