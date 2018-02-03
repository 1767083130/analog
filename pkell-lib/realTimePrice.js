'use strict';
const mongoose = require('mongoose');
const RealTimePrice = mongoose.model('RealTimePrice');
const RealTimePriceHistory = mongoose.model('RealTimePriceHistory');
const SystemRunSettings = mongoose.model('SystemRunSettings');
const DayPrice = mongoose.model('DayPrice');

const BothApi = require('./apiClient/bothApi');
const configUtil = require('./utils/configUtil');
const symbolUtil = require('./utils/symbol');
const common = require('./common');

const SITES = configUtil.getSites(); //['huobi','okcoin'];
const Main_Site = configUtil.getDefaultSite();
const HISTORY_DAYS = 180; 
const ONE_Day_Milli = 24 * 60 * 60 * 1000; //一天时长的毫秒数

const ApiRealPrice_ValidTime = 1 * 1000; //api即时市场信息有效时长。 1秒
const SocketRealPrice_ValidTime = 5 * 60 * 1000; //Socket即时市场信息有效时长。5分钟

const RealPrice_SyncInterval = 200;  //即时价格的最小保存间隔（ms），需要至少等待一个时间，才能进行下一次同步，这样避免了因为太频繁导致系统脱机
const RealPriceHistory_SyncInterval = 3 * 1000; //历史即时价格信息最小保存间隔。现设置为3s


let _realPrices = []; //缓存一定时间内的市场价格

let realTimePrice = new class{

    /** 
     * 同步市场行情信息
     * 
     * @param {Function} stepCallback 获取成功后的回调函数
     */
    syncRealPrices(stepCallback){
        let sites = configUtil.getPlatforms();
        for(var siteItem of sites){
            // if(['chbtc','bitvc'].indexOf(siteItem.site) == -1){ //todo ['chbtc','bitvc']  应当去掉
            //     continue;
            // }
            if(!siteItem.isValid){
                continue;
            }

            for(var symbolItem of siteItem.symbols){
                let symbolInfo = symbolUtil.getFullSymbol(symbolItem.symbol,siteItem.site);
                let methodType = configUtil.getAccessWay(siteItem.site,symbolInfo.contractType,'market',1);
                if(methodType == 'restful'){
                    this.getAsyncRealPrices([siteItem.site],[symbolItem.symbol],stepCallback);
                }
            }
        }
    }

    /**
     * 获取缓存中的市场信息
     * 
     * @api public
     */
    getCacheRealPrices(){
        return _realPrices;
    }

    /**
     * 获取特定交易网站的某个币种的价格信息
     * 
     * @param {String} site,交易网站
     * @param {String} symbol,币种
     * @returns {Object} 价格信息. e.g.
       {
            time: new Date(), //时间
            site: "huobi", //交易网站
            symbol: "btc#cny", //币种
            buys: [[4005,1.3],[4004,1.54],[4003,1.45]], //买入委托，按照价格降序排序
            sells: [[4006,1.3],[4007,1.54],[4007,1.45]], //卖出委托，按照价格升序排序
       }
     *
     */
    * getRealPrice(site,symbol){
        let symbolInfo = symbolUtil.getFullSymbol(symbol,site);
        let accessWay = configUtil.getAccessWay(site,symbolInfo.contractType,'market',1);
    
        let checkTime = function(time){
            var interal = (+new Date()) - time.getTime();
            if(accessWay == 'restful'){
                return interal < ApiRealPrice_ValidTime;
            } else if(accessWay == 'socket'){
                return interal < SocketRealPrice_ValidTime;
            }
        }

        let realPrice;
        //先从缓存中读取
        for(var i = _realPrices.length - 1; i >= 0; i--){
            let item = _realPrices[i];
            if(item.symbol == symbol && item.site == site ){
                if(checkTime(item.time)){
                    realPrice = item;
                    break;
                } else {
                    break;
                }
            }
        }

        //没有获取到，从数据库中读取 
        if(!realPrice){
            let query = { site: site, symbol: symbol };
            let realTimePrice = yield RealTimePrice.find(query).sort({time: -1}).limit(1);
            if(realTimePrice && realTimePrice.length > 0  && checkTime(realTimePrice[0].time)){
                realPrice = realTimePrice[0];
            }
        }

        //还没有获取到，从交易网站中获取
        if(!realPrice && accessWay == 'restful'){
            let realPrices = yield* this.getSyncRealPrices([site],[symbol]);
            if(realPrices && realPrices.length > 0){
                realPrice = realPrices[0];
            }
        }

        return realPrice;
    }

    getLatestRealPrices(){
        return _realPrices;
    }

    /**
     * 从各个交易网站中异步获取某个币种的实时行情，这里进行了保存
     *
     * @param {Array[String]} sites,交易平台，如['huobi','okcoin']
     * @param {String} symbol, 币种，如'btc'
     * @param {Function} stepCallback,获取行情后的回调函数
     * @returns 
     * @public
     */
    getAsyncRealPrices(sites,symbols,stepCallback){

        //return [];
        //从各个交易网站中获取行情
        for(var i = 0; i < sites.length; i++){
            let site = sites[i];
            let bothApi = new BothApi(site);

            for(var j = 0; j < symbols.length; j++){
                let symbol = symbols[j];
                bothApi.getRealPrice(symbol,function(err,res){
                    if(err || !res.isSuccess){
                        if(!err){
                            err = new Error(`从交易网站(${site})获取行情失败`);
                        }

                        return stepCallback && stepCallback(err);
                    }
                    
                    let realTimePrice = res.realPrice;
                    try{
                        //将行情信息重新组织，放置到一个新的数组中,这样更方便后续操作
                        var detail = {
                            time: realTimePrice.time,
                            site: site, 
                            symbol: symbol,
                            buys: realTimePrice.buys,
                            sells: realTimePrice.sells
                        };
                        stepCallback && stepCallback(err,detail);
                        this.cacheRealPrice(detail);
                    } catch(e) {
                        //忽略错误
                        stepCallback && stepCallback(e);
                    }
                }.bind(this));
            }
        }
    }

    /**
     * 缓存实时行情
     * 
     * @param {Object} detail 实时行情数据，e.g { time: new Date(),site: "houbi",symbol:"btc#cny",buys:[[1234,1]],sells: buys:[[1235,12]]}
     */
    cacheRealPrice(detail){
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
    

    /**
     * 从各个交易网站中同步获取某个币种的实时行情，只有全部获取成功才返回,这里不进行保存
     *
     * @param {Array[String]} sites,交易平台，如['huobi','okcoin']
     * @param {String} symbols, 币种，如['btc','eth']
     * @returns {Array} 如[{time:"2016/08/09 12:01:23",site:"huobi",symbol:"btc",buys:[5,4,3,2],sells:[12,11,10,9] }]
     * @public
     */
    * getSyncRealPrices(sites,symbols){
        //从各个交易网站中获取行情
        let promises = [];
        for(var i = 0; i < sites.length; i++){
            let site = sites[i];
            let bothApi = new BothApi(site);

            for(var j = 0; j < symbols.length; j++){
                let promise = bothApi.getRealPrice(symbols[j]);
                promises.push(promise);
            }
        }
        var values = yield Promise.all(promises);
        
        //将行情信息重新组织，放置到一个新的数组中,这样更方便后续操作
        let details = [];
        for(var m = 0; m < sites.length; m++){
            for(var n = 0; n < symbols.length; n++){
                let res = values[ m * n + n];
                if(res && res.isSuccess && res.realPrice){
                    details.push({
                        time: res.realPrice.time,
                        site: sites[m], 
                        symbol: symbols[n],
                        buys: res.realPrice.buys,
                        sells: res.realPrice.sells
                    });
                }
            }
        }

        return details;
    }

   

    //------------下面方法并没有任何的单元测试 //TODO
    
    /**
     * 导入各个交易平台的日行情
     *
     * @public
     */
    * importDayPrices() {
   
        var oneDayMilli = 24 * 60 * 60 * 1000;
        for(var i = 0; i < SITES.length; i++){
            let site = SITES[i];

            //获取最近导入的日期
            let runLog = yield SystemRunSettings.getRecentDay(site); //这里可以考虑记录最近获取的提高效率

            var today = new Date();
            today.setHours(0, 0, 0, 0);

            /*
            导入日行情。
            （1）如果是第一次导入，则只导入今天的
            （2）如果不是第一次导入，则读取最近一次的日行情。最近一次的日行情不是今天时，需要弥补导入
            */
            let currentDate = today;
            if(runLog){
                var lastDate = runLog.lastTimeImportDayInfo;
                lastDate.setTime(+runLog.lastDay + oneDayMilli);
                currentDate = lastDate;
            } 

            let endDate = new Date();
            endDate.setHours(0, 0, 0, 0);
            yield* this.getPeriodDayPrices(currentDate,endDate);

            runLog.lastTimeImportDayInfo = new Date();
            runLog.save();
        }
    }

    /**
     * Invoke an api by method name.
     *
     * @param {String} method, method name
     * @param {Function(err, response)} callback
    */
    * getHistoryPrices() {
        var oneDayMilli = 24 * 60 * 60 * 1000;
    
        for(var i = 0; i < SITES.length; i++){
            var site = SITES[i];
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            /*
            导入历史的每日行情。
            （1）导入时间段: 半年前的日期~最早导入的日期
            */
            let currentDate = today;
            currentDate.setTime(today - oneDayMilli * HISTORY_DAYS);

            let endDate = new Date();
            endDate.setHours(0, 0, 0, 0);
            let firstDayPrice = yield* DayPrice.getFirstDayPrice(site);
            if(firstDayPrice){
                endDate = firstDayPrice.date;
            }

            yield* this.getPeriodDayPrices(currentDate,endDate);
        }
    }

    /**
     * Invoke an api by method name.
     *
     * @param {String} method, method name
     * @param {Function(err, response)} callback
     */
    * getPeriodDayPrices(startDate,endDate,site){
        var currentDate = startDate;

        while(endDate >= currentDate){
        
            var isContinue = true;  //只要一次获取失败,则终止后面的执行

            //获取行情并保存
            var getDayPriceRes = yield api.getDayPrice(currentDate,site);
            if(dayPrice){
                dayPrice = yield DayPrice.create({
                    date: currentDate,
                    site: site, 
                    start: 12, //todo
                    end: { num: 12,price: 12 }, 
                    high: { num: 12,price: 12 },
                    low: { num: 12,price: 12 },
                    vol: 12,
                    totalAmount: 12
                });

                if(dayPrice){ //todo

                } else {
                    isContinue = false;
                }
            }
            else{ //如果获取行情信息失败
                isContinue = false;
            }

            if(!isContinue){ //途中失败,则不往下执行了
                break;
            }

            var nextDayValue = +currentDate + ONE_Day_Milli; //推进到下一天
            currentDate.setTime(nextDayValue);
        }
    }

}();

module.exports = realTimePrice;

