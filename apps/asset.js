'use strict';

const Decimal = require('decimal.js'),
    request = require('supertest'),
    assert = require('assert'),
    co = require('co'),
    fs= require('fs'),
    path = require('path'),
    symbolUtil  = require('../lib/utils/symbol'),
    appConfigUtil = require('../lib/utils/configUtil');
const cacheClient = require('../lib/apiClient/cacheClient').getInstance();



let datas = []; //e.g {"event":"subscribed","channel":"book","chanId":64,"prec":"P0","freq":"F0","len":"25","pair":"BTCUSD"}
const SYMBOL = 'btc#cny';
const platforms = [{ site: "bitfinex", clientType: "client"},
                  {site: "okex", clientType: "futuresClient"}]; //appConfigUtil.getAllPlatforms();

let marketInfo = [],
    indexInfo = [],
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
        let btcTotal = getTotalAsset();
        console.log(`btc总数量：${btcTotal}`);
        //process.exit();
    },10000);
}

for(let platform of platforms){
    let socketClient,
        sellId,buyId; //卖单ID

    socketClient = appConfigUtil.getSiteClient(platform.site,platform.clientType); 
    socketClient.connect();
    socketClient.on('open',function(){
        console.log(`交易网站${platform.site}已连接成功...`);

        let channels = ['wallet','position','market'];  //['order','wallet','position','market','index'];
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
        //console.log(JSON.stringify(res));
            
        switch(res.channel){
        case 'market':
            let market = marketInfo.find(function(value){
                return value.site == platform.site;
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
                marketInfo.push(res);
                log(marketInfo);
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

function getTotalAsset(){
    let bitfinexMarket = marketInfo.find(p => p.site == 'bitfinex');
    if(!bitfinexMarket){
        return;
    }

    let coins = [];
    for(let siteWallet of walletInfo){
        for(let walletItem of siteWallet.data){
            let orgCoin = coins.find(p => p.coin == walletItem.coin)

            if(orgCoin){
                orgCoin.total = new Decimal(orgCoin.total).plus(walletItem.total);
            } else {
                coins.push({
                    coin:  walletItem.coin,
                    total: walletItem.total
                });
            }
        }
    }

    let btcTotal = new Decimal(0);
    for(let coinItem of coins){
        if(coinItem.coin == 'btc'){
            btcTotal = btcTotal.plus(coinItem.total); 
        } else if(coinItem.coin == 'usd'){
            let symbol = symbolUtil.getSymbolByParts({
                targetCoin: 'btc',
                settlementCoin: 'usd'
            });
            let coinDepth = bitfinexMarket.data.find(p => p.symbol == symbol); 
            let symbolPrice = new Decimal(coinDepth.buys[0][0]).plus(coinDepth.sells[0][0]).div(2);
            let itemTotal = new Decimal(1).div(symbolPrice).times(coinItem.total);
            btcTotal = btcTotal.plus(itemTotal); 
        } else {
            let symbol = symbolUtil.getSymbolByParts({
                targetCoin: coinItem.coin,
                settlementCoin: 'btc'
            });
            let coinDepth = bitfinexMarket.data.find(p => p.symbol == symbol);
            if(coinItem.total > 0){
                if(!coinDepth){
                    console.log(`警告！获取网站bitfinex的币种${symbol}行情失败，将不计入总资产！`);
                } else {
                    let itemTotal = new Decimal(coinDepth.buys[0][0]).plus(coinDepth.sells[0][0]).div(2).times(coinItem.total);
                    btcTotal = btcTotal.plus(itemTotal); 
                }
            }
        }
    }

    return btcTotal.toFixed(3);
        
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