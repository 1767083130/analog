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
        let userName= req.user.userName;
        let isTest,openType,price,isValid,account,addtional;
        let model = {
            // userName:userName,
            // isTest:isTest || false,
            // openType:JSON.stringify(openType||[]),
            // price:JSON.stringify(price||[]),
            // isValid:isValid|| false,
            // account:{
            //     totalPosition:JSON.stringify(totalPosition||[]),
            //     coins:[{
            //         coin:JSON.stringify(coin||[]),
            //         position:JSON.stringify(position||[]),
            //         priority:JSON.stringify(priority||[]),
            //         priorityPosition:JSON.stringify(priorityPosition||[])
            //     }]
            // },
            // addtional:{
            //     strategyType:JSON.stringify(strategyType||[]),
                
            // }
        };
        
        model.messages = req.flash('error');
        res.render('liaotianshi', model);
      
    
    });

    router.post('/',function(req,res){
       
        // sio.on('connection', function (socket) {
        //     console.log('a user connected');
        //     socket.on('connect', function () {
        //         console.log('user connect');
        //     });
        //     socket.on('chat message', function(msg) {
        //         console.log("msg:" + msg);
        //         sio.emit('chat message', msg);
        //     });
        //});
       
      //console.log(req.body.totalAmount);
       req.session.login = req.body.login;

        res.render('liaotianshi',{

        });
        
    });
}

// sio.on('connection',function(socket){
//     socket.on('login',function(data){
//         socket.emit('login',data)
//     })
// })