'use strict';

const database = require('../lib/database');
const customConfig = require('../config/customConfig');
const mongoose = require('mongoose');
const cacheClient = require('../lib/apiClient/cacheClient').getInstance();

let dbConfig = customConfig.databaseConfig;
database.config(dbConfig);

// let db = mongoose.connection;
// db.once('open',function callback(){
// });

const Decimal = require('decimal.js'),
    request = require('supertest'),
    assert = require('assert'),
    co = require('co'),
    fs= require('fs'),
    path = require('path'),
    positionLib = require('../lib/position'),
    symbolUtil  = require('../lib/utils/symbol'),
    appConfigUtil = require('../lib/utils/configUtil');

let datas = []; //e.g {"event":"subscribed","channel":"book","chanId":64,"prec":"P0","freq":"F0","len":"25","pair":"BTCUSD"}
const SYMBOL = 'btc#cny';
const platforms = [{ site: "bitfinex", clientType: "client"},
                   {site: "okex", clientType: "futuresClient"}
                ]; //appConfigUtil.getAllPlatforms();

let positionInfo = [],
    walletInfo = [];

process.on('uncaughtException', function(e) {
    //todo
    console.error(e);
});

clearLogs();

if(cacheClient.readyState == 'OPEN'){
    start();
} else {
    cacheClient.start(function(){
        start();
    });    
}

function start(){
    setTimeout(function(){
        co(function *(){
            let positionsInfo = yield* trialPositions();
            console.log(positionsInfo);
        }).catch(function(err){
            console.error(err);
        })
    },20000);
}

for(let platform of platforms){
    let socketClient,
        sellId,buyId; //卖单ID

    socketClient = appConfigUtil.getSiteClient(platform.site,platform.clientType); 
    socketClient.connect();
    socketClient.on('open',function(){
        console.log(`交易网站${platform.site}已连接成功...`);

        let channels = ['position','wallet'];  //['order','wallet','position','market','index'];
        for(let channel of channels){
            let options = {
                event: "addChannel",
                channel: channel,
                symbol: platform.clientType == 'client' ? '*' : '_'
            };
            socketClient.send(options);
        }
    });

    //处理返回的数据
    socketClient.onMessage(function(res){
        switch(res.channel){
        case 'position':
            if(res.action == "snapshot"){
                handlePositionsItems(res,platform.site);
            }
            break;
        case 'wallet':
            let wallet = walletInfo.find(function(value){
                return value.site == platform.site;
            });
            if(wallet){
                for(let walletItem of res.data){
                    let orgItemIndex = wallet.data.findIndex(function(value){
                        return value.type == walletItem.type;
                    });
                    if(orgItemIndex >= 0){
                        wallet.data[orgItemIndex] = walletItem;
                    } else {
                        wallet.data.push(walletItem);
                    }
                }
            } else {
                walletInfo.push(res);
                log(walletInfo);
            }
 
            break;
        }
        

    }.bind(this));

    socketClient.onError(function(err){
        console.log(JSON.stringify(err));
    }.bind(this));

    socketClient.on('error',function(e){
        console.error(e); 
        //console.log('套接字出错，错误信息：' + JSON.stringify(e));
    });

    socketClient.on('pong',function(){
        console.log(`site:${platform.site} pong`);
    });
}

function handlePositionsItems(res,site){
    let market = positionInfo.find(function(value){
        return value.site == site;
    });

    if(market){
        for(let marketItem of res.data){
            let orgItemIndex = market.data.findIndex(function(value){
                return value.symbol == marketItem.symbol;
            });
            if(orgItemIndex >= 0){
                market.data[orgItemIndex] = marketItem;
            } else {
                market.data.push(marketItem);
            }
        }
    } else {
        positionInfo.push(res);
        //log(positionInfo);
    }
}

function* trialPositions(){
    // let bitfinexMarket = marketInfo.find(p => p.site == 'bitfinex');
    // if(!bitfinexMarket){
    //     return;
    // }

    let coins = [];
    for(let siteWallet of walletInfo){
        for(let walletItem of siteWallet.data){
            let orgCoin = coins.find(p => p.coin == walletItem.coin)

            if(orgCoin){
                orgCoin.total = new Decimal(orgCoin.total).plus(walletItem.total).toNumber();
            } else {
                coins.push({
                    coin:  walletItem.coin,
                    total: walletItem.total
                });
            }
        }
    }

    for(let sitePositions of positionInfo){
        for(let position of sitePositions.data){
            //@returns {string} 货币符号.如 { settlementCoin: "cny",targetCoin: "btc", contractType: 'spot',dateCode: "1w" }
            let coin = symbolUtil.getSymbolParts(position.symbol,position.site).targetCoin;
            let coinAmount = yield* positionLib.getSymbolHoldAmount(position);
            if(position.positionType == 2){
                coinAmount = -Math.abs(coinAmount);
            }

            let orgCoin = coins.find(p => p.coin == coin);
            
            if(orgCoin){
                orgCoin.total = new Decimal(orgCoin.total).plus(coinAmount).toNumber();
            } else {
                coins.push({
                    coin:  coin,
                    total: coinAmount.toNumber()
                });
            }
        }
    }    
    
    return coins;  
}

function log(data){
    fs.appendFile(path.join(__dirname,'logs',  'asset_log.txt'), JSON.stringify(data) + '\r\n\r\n', (err) =>  {
        if (err) throw err;
        //console.log("Export Account Success!");
    });
}

function clearLogs(){
    let dir = path.join(__dirname,'logs');
    fs.readdirSync(dir).forEach(function(item){
        let stat = fs.lstatSync(path.join(dir, item));
        if(stat.isDirectory()){
            return;
        }
        fs.unlinkSync(path.join(dir, item));
    });
}


let POSITIONMODE = {
    site: { type: String, required: true }, //平台名称
    userName: { type: String, required: true }, 
    isTest: { type: Boolean, "default": false },
   
    contractId: { type: String }, // 合约id
    contractName: { type: String }, // 合约名称
    avgPrice: { type: String }, // 开仓均价
    balance: { type: String }, // 合约账户余额
    bondFreez: { type: String }, // 当前合约冻结保证金
    costPrice: { type: String },// 开仓价格
    eveningUp: { type: String }, // 可平仓量
    forcedPrice: { type: String }, // 强平价格
    positionType: { type: String }, // 仓位 1多仓 2空仓
    profitReal: { type: String }, // 已实现盈亏
    fixMargin: { type: String }, // 固定保证金
    holdAmount: { type: String }, // 持仓量
    unit: { type: String }, //单位。格式为“数量_币种”,e.g 10_usd,表示一个单位为10美元，当持仓量为10时，那么整个仓位为100usd
    leverRate: { type: String }, // 杠杆倍数
    positionId: { type: String },// 仓位id
    symbol: { type: String }  // btc#usd   ltc#usd   eth#usd   etc#usd   bch#usd
}