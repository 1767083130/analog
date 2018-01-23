'use strict';

const mongoose = require('mongoose');
const realTimePrice = require('../models/realTimePrice');
const account = require('../models/account');
const user = require('../models/user');

exports.addUser = function(user,conditions,callback){
    user.save(conditions,function(err){
        if(err){
            console.log(err);
        }
        console.log("1");
    })
}



exports.updateReal = function(account,conditions,callback){
    account.update(conditions,function(err,result){
        if(err){
            console.log(err);
        }
        if(result.n!=0){
            console.log('1');
        }else{
            console.log('2');
        }
    })
}

exports.realTimePriceLoad = function(realTimePrice,conditions,callback){
    realTimePrice.findOne(conditions,function(err,result){
        if(err){
            console.log(err);
        }
        console.log(result);
        console.log('0');
    })
}
