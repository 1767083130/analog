'use strict';
//require('./index');
const customConfig = require('./config/customConfig');
const database = require('./lib/database');
const mongoose = require('mongoose');
const configUtil = require('./lib/utils/configUtil');

let dbConfig = customConfig.databaseConfig;
database.config(dbConfig);

let db = mongoose.connection;
db.once('open',function callback(){
    //runSchedule();
    connectSockets();
});

const TransferStrategy = mongoose.model('TransferStrategy');

const order = require('./lib/order');
const transfer = require('./lib/transfer');
const account = require('./lib/account');

const realTimePrice = require('./lib/realTimePrice');
const futureIndex =  require('./lib/futureIndex');
const strategy = require('./lib/strategy');
const transferController =  require('./lib/transferStrategys/transferController');
const co = require('co');
const socketClientUtil = require('./lib/apiClient/socketClientUtil');


const INTERVAL = 1000;

process.on('uncaughtException', function(e) {
    console.error(e);
});

function runSchedule(options) {
    options = options || {};

    if (options.oneTime) { //只执行一次
        syncRecentOrders();
        //syncAllAccounts();
        syncRealPrices();
        syncFutureIndexs();
        runRealExchanges();
    }
    else {
        console.log('获取行情程序启动' + (new Date()).toLocaleString()); 
        setInterval(syncRealPrices, 600);
        setInterval(syncFutureIndexs, 600);
        return; //todo

        console.log('同步账户信息程序启动' + (new Date()).toLocaleString());
        //setTimeout(syncAllAccounts, 0);   //(syncAllAccounts,INTERVAL * 5);
        setInterval(syncAllAccounts, INTERVAL * 60 * 60);

        // setTimeout(syncRealPrices, 1);
        // return;
        console.log('同步委托状态程序启动' + (new Date()).toLocaleString());
        setTimeout(syncRecentOrders, INTERVAL * 1.2);  

        console.log('自动运行策略启动' + (new Date()).toLocaleString());
        setInterval(runRealExchanges, INTERVAL * 60);

        // setInterval(syncAllOrders, INTERVAL * 5);
        // //setInterval(syncTransfers,INTERVAL);
        // setInterval(getRealTimePrices, 600);
        // setInterval(runRealExchanges, INTERVAL * 10);

        //检查状态，如果碰到超时未执行完毕的任务，则认为执行失败
        //setInterval(checkTask,20000);
  
        //syncRecentOrders(siteRealPrices,identifier,callBack) {
        //setInterval(orderController.getRealTimePrices, INTERVAL);
    }
}

function connectSockets(options){
    socketClientUtil.connectSites(options);
}

function syncRealPrices(){
    try{
        realTimePrice.syncRealPrices(function(err,res){
            if(err){
                console.log(`获取行情时发生错误,${(new Date()).toLocaleString()}: ${err.message}`);
                return;
            } 
            //let realPrices = realTimePrice.getLatestRealPrices();
            //console.log(`最近的实时行情中总共有${realPrices.length}个数据项`);
        });
    } catch(err){
        console.error(err);
    }
}

function syncFutureIndexs(){
    try{
        futureIndex.syncFutureIndexs(function(err,res){
            if(err){
                console.log(`获取合约指数价格时发生错误,${(new Date()).toLocaleString()}: ${err.message}`);
                return;
            } 
            //let realPrices = realTimePrice.getLatestRealPrices();
            //console.log(`最近的实时行情中总共有${realPrices.length}个数据项`);
        });
    } catch(err){
        console.error(err);
    }
}

function syncTransfers(){
    try{
        co(function* (){
            console.log('--开始同步转币信息--');
            let count = 0;
            yield* transfer.syncTransfers(function(stepRes){ 
                console.log(stepRes.message);

                count++;      
                if(stepRes.stepCount <= count){
                    console.log('--同步转币信息结束--');
                }
            });
        });
    } catch(err){
        console.error(err);
    }
}

function syncAllAccounts(){
    try{
        co(function* (){
            //console.log('--开始同步全部账户--');
            let count = 0;
            yield* account.syncAllAccounts(function(stepRes){
                //let stepRes = { 
                //    account: account, 
                //    stepIndex: i, 
                //    message: `第${i}个同步成功，总共${accounts.length}个`,
                //    isSuccess: true;
                //    stepCount: accounts.length 
                //};   
                console.log('同步账户。' + stepRes.message);

                count++;      
                if(stepRes.stepCount <= count){
                    //console.log('--同步全部账户结束--');
                }
            });
        });
    } catch (err){
        console.error(err);
    }
}

function syncRecentOrders(){
    try {
        co(function* (){
            //console.log('--开始同步全部账户的订单状态--');
            let count = 0;

            let onChanged = function(e){
                co(function *(){
                    yield* transferController.onOrderStatusChanged(e);
                });
            };
            let onDelayed = function(e){
                co(function *(){
                    yield* transferController.onOrderDelayed(e);
                });
            };
            order.off('change',onChanged);
            order.off('delayed',onDelayed);
            order.on('change',onChanged);
            order.on('delayed',onDelayed);

            let stepCallBack = function(err,stepRes){
                if(!stepRes.isSuccess){
                    console.log(stepRes.message);
                }

                count++;      
                if(stepRes.stepCount <= count){
                    //console.log('--同步全部账户的订单状态结束--');
                }
            };
            order.syncOrdersByInteval({},stepCallBack)

            //yield* order.syncRecentOrders(stepCallBack);
        }).catch(function(err){
            console.log(err);
        });
    } catch (err){
        console.error(err);
    }
}

function runRealExchanges(){
    try{
        co(function* (){       
            let transferStrategys = yield TransferStrategy.find({
                isValid: true,
                auto: true
            });

            for(var item of transferStrategys){
                let res = yield* strategy.runTransferStrategy(item);
                if(res.isSuccess){
                    console.log(`${(new Date()).toLocaleString()}成功执行策略${item.name},策略ID为：${item._id.toString()}。message:${res.message}`);
                } else {
                    console.log(`${(new Date()).toLocaleString()}执行策略${item.name}失败,策略ID为：${item._id.toString()}，错误信息：${res.message}`);
                }
            }
        }).catch(function(err){
            console.error(err);
        });
    } catch (err){
        console.error(err);
    }
}

