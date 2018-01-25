'use strict';

const mongoose = require('mongoose');

var ReminderSettingsModel = function(){
    const ReminderSettingsSchema = mongoose.Schema({
        userId : {type: Number},//用户id
        site: { type: String, required: true }, //平台名称
        symbol: String, //cny、btc#cny、ltc、usd 货币类型
        high : [],//最高
        low : [],//最低
        //buys: [], //买10  每个数组项同时也为一个数组，格式为 [price,amount]，[0],价格；[1]为委托数量
       // sells: [], //卖10 每个数组项同时也为一个数组，格式为 [price,amount]，[0],价格；[1]为委托数量
        time : {type: Date, "default": Date.now()} //时间
    });
    /**
     * 实例
     */
    ReminderSettingsSchema.methods = {
        addReminder : function(userId,callback){
            return this.find({userId:userId},callback);
        },
        
    }
    /**
     * 静态
     */
    ReminderSettingsSchema.statics = {
        load : function(_id,callback){
            return this.findOne({_id:userId},callback).exec();
        },
        getAddRem : function(userId,site,symbol,high,low,time,callback){
            return this.find({userId:userId,site:site,symbol:symbol,high:high,low:low,time:time},callback);
        }
        
    }
    //ReminderSettingsSchema.index({userId:1});
    
    return mongoose.model("ReminderSettings",ReminderSettingsSchema);
}

module.exports = new ReminderSettingsModel();