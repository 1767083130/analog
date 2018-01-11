'use strict';


const mongoose = require('mongoose');

const RealTimePrice = mongoose.model('RealTimePrice');
const RealTimePriceHistory = mongoose.model('RealTimePriceHistory');


let _realPrices = []; //缓存一定时间内的市场价格
//没有间隔先添加看看
let RealPrice_SyncInterval = 2;
let RealPriceHistory_SyncInterval = 2;


let realTimePrice = new class{
    /**
     * 缓存实时行情
     * 
     * @param {Object} detail 实时行情数据，e.g { time: new Date(),site: "houbi",symbol:"btc#cny",buys:[[1234,1]],sells: buys:[[1235,12]]}
     */
    detaicacheRealPrice(detail){
        let now = new Date(), lastRealPrice;
        let lastRealPriceIndex = _realPrices.findIndex(function(value){
            return value.site == detail.site && value.symbol == detail.symbol;
        });
        if(lastRealPriceIndex > -1){
            lastRealPrice = _realPrices[lastRealPriceIndex]
        }
        
        let detailCopy = Object.assign({}, detail);
        detailCopy.symbol = detailCopy.symbol.toLowerCase();
        detailCopy.site = detailCopy.site.toLowerCase();

        //
        
        if(lastRealPrice){
            detailCopy.syncTime = lastRealPrice.syncTime;
            detailCopy.syncHistoryTime = lastRealPrice.syncHistoryTime;
            lastRealPrice = detailCopy;
            _realPrices[lastRealPriceIndex] = lastRealPrice;
        } else {
            detailCopy.syncTime = new Date();
            detailCopy.syncHistoryTime = new Date();
            _realPrices.push(detailCopy);
        }

        if(!lastRealPrice || !lastRealPrice.syncTime || (lastRealPrice.syncTime < now && +now - lastRealPrice.syncTime >= RealPrice_SyncInterval)){
            RealTimePrice.findOneAndUpdate(
                { site: detailCopy.site,symbol: detailCopy.symbol },  //, time: {$lt: detail.time } 
                detailCopy, 
                { upsert: true, sort: {time: -1} },
            function(err,doc){
                if(err){
                    return console.error(err);
                }
            });

            if(lastRealPrice){
                lastRealPrice.syncTime = new Date();
            }
        }

        if(!lastRealPrice || !lastRealPrice.syncHistoryTime || (lastRealPrice.syncHistoryTime < now && +now - lastRealPrice.syncHistoryTime >= RealPriceHistory_SyncInterval)){
            let historyItem = new RealTimePriceHistory(detailCopy);
            historyItem.save(function(err){
                if(err){
                    console.error(err);
                }
            });

            if(lastRealPrice){
                lastRealPrice.syncHistoryTime = new Date();
            }
        }
    }
}

exports.realTimePrice = realTimePrice;