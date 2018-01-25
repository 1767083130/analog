'use strict';

const mongoose = require('mongoose');

var ReminderInputModel = function(){
    const ReminderInputSchema = mongoose.Schema({
        userId : {type: Number},//用户id
        time : Date, //输出测试时间
    })
    /**
     * Methods
     */
    ReminderInputSchema.methods = {

    }

    /**
     * statics
     */
    ReminderInputSchema.statics = {
        /**
         * 按照id查询
         * 
         */
        load: function (_id) {
            return this.findOne({ _id })
                .exec();
        },
        getReminder: function(userId){
            return this.findOne({userId:userId}).exec();
        },

    }

    return mongoose.model('ReminderInput',ReminderInputSchema);
}   

module.exports = new ReminderInputModel();