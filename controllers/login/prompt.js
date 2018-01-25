'use strict';

const sio = require('socket.io');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//const app = module.exports.createServer();
// const Account  = mongoose.model('account');//账户
// const RealTimePrice = mongoose.model('realTimePrice');//市场及时价格信息
const Strategy = mongoose.model('strategy');//市场策略
// const ManualTask = mongoose.model('manualTask');//需要人工处理的任务
// const TransferStrategy = mongoose.model('transferStrategy');//转移策略
const user = mongoose.model('user');//转移策略
module.exports = function(router){
    router.get('/',function(req,res){
        
        let model = {

        };
        
        model.messages = req.flash('error');
        res.render('liaotianshi', model);
      
    
    });

    router.post('/',function(req,res){
       
        
       
    
        res.render('liaotianshi',{

        });
        
    });
}

