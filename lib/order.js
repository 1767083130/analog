'use strict';
const mongoose = require('mongoose');
const Order  = mongoose.model('Order');
const Strategy = mongoose.model('Strategy');
const EventEmitter = require('eventemitter2').EventEmitter2;
const Decimal = require('decimal.js');
const Api = require('./apiClient/api');
const BothApi = require('./apiClient/bothApi');

const realTimePrice = require('./realTimePrice');
const account = require('./account');
const common = require('./common');
const clientIdentifier = require('./clientIdentifier');
const configUtil = require('./utils/configUtil');
const symbolUtil = require('./utils/symbol');

const DEFAULT_SYNC_INTEVAL = 1000 * 1.2; //1.2s

class OrderController extends EventEmitter{
    constructor(){
        super();
    }

    /**
     * 执行需要委托交易的差价策略的step
     * @param {Object} logOperate,对应TransferStrategyLog的operates项
     * @param {ClientIdentifier} identifier,可为空
     * @param {Number} stepAmount,差价策略的step的金额
     * @returns {Object} 是否成功。如{
         { isSuccess: true, //是否成功
           actionId: newOrder._id, //委托Id
           order: newOrder } //委托交易
     * @public
     */
    * runOrderOperate(logOperate,identifier,stepAmount){
        let res = { isSuccess: false };
        let operate = logOperate.orgOperate;
        let transferStrategyLog = logOperate.transferStrategyLog;

        if(stepAmount <= 0){
            return { isSuccess: false, errorCode: "100006", message: "参数stepAmount不能<=0" };
        }
        
        if(!transferStrategyLog){
            return  { isSuccess: false, errorCode: "100006", message: "参数operate.trategyLog不能为空" };
        }

        if(operate.action != "trade"){
            return  { isSuccess: false, errorCode: "100006", message: "operate.action不为trade时，不能执行此方法" };
        }

        if(!identifier){
            identifier = yield clientIdentifier.getUserClient(transferStrategyLog.userName,operate.site);  
            if(!identifier){
                return  { isSuccess: false, errorCode: "100003", message: "client为空" };              
            }
        }

        let order = {
            site: operate.site, //平台名称
            userName: transferStrategyLog.userName, 
            isTest: transferStrategyLog.isTest,
            side: operate.side, //buy或sell
            optionType: operate.optionType || 'call',
            leverage: operate.leverage || 1,
            reason: "transfer", //原因
            symbol: operate.symbol, //cny、btc、ltc、usd
            consignDate: new Date(), //委托时间

            price: logOperate.price, //委托价格
            amount: stepAmount, //总数量

            consignAmount: stepAmount, //已委托数量
            //bargainAmount:  { type: Number, "default": 0 }, //已成交数量
            //prarentOrder: { type: Schema.ObjectId },
            //childOrder: { type: Schema.ObjectId }, 
            actionId: transferStrategyLog._id,
            operateId: logOperate._id, //操作Id
            isSysAuto: true,
            //outerId: String,  //外部交易网站的Id
            status: "wait", 

            created: new Date(), //创建时间
            modified: new Date() //最近修改时间
        };

        res = yield* this.createOrder(order,identifier);
        if(res.isSuccess){
            //logOperate.undeal -= stepAmount;
            logOperate.consignAmount = new Decimal(logOperate.consignAmount).plus(stepAmount).toNumber();
            yield transferStrategyLog.save();
        }

        return res;
    }

    /**
     * 提交一个交易委托，并保存记录。 
     *
     * @param {Order} order, 交易委托 如{ site: "huobi", userName: "lcm", autoRetry: false,
     *          consignAmount: 12,price: 12, side: "buy" || "sell",reason: "调仓", symbol: 'btc' }
     * @param {ClientIdentifier} identifier,可为空
     * @returns {Object} 是否成功。如{
         { isSuccess: true, //是否成功
           actionId: newOrder._id, //委托Id
           order: newOrder } //委托交易
     * @public
     */
    * createOrder(order,identifier){
        if(!identifier){
            identifier = yield clientIdentifier.getUserClient(order.userName,order.site); 
            if(!identifier){
                //todo 最好记录
                return { isSuccess: false, errorCode: "100003", message: `找不到授权信息.userName:${order.userName},site:${order.site} ` };
            }
        }

        //let api = new Api(identifier);
        let bothApi = new BothApi(identifier);
        let newOrder = new Order(order);

        newOrder.modified = new Date();
        newOrder.status = 'consign';

        if(order.isTest){
            newOrder = yield newOrder.save(newOrder); 
        } else {
            //todo 这里要考虑系统的鲁棒性
            let orderRes;
            let apiOptions = { 
                symbol: newOrder.symbol, 
                side: newOrder.side,
                type: newOrder.type,
                optionType: newOrder.optionType,
                leverage: newOrder.leverage || 1,
                amount: order.consignAmount, 
                price: newOrder.price,
                storeId: newOrder.storeId || 0
            };

            orderRes = yield bothApi.createOrder(apiOptions);
            //if(order.side == "buy"){
            //    orderRes = yield api.buy(apiOptions);
            //} else  if(order.side == "sell"){
            //    orderRes = yield api.sell(apiOptions);
            //}

            if(!orderRes.isSuccess){
                return { isSuccess: false, errorCode: "100005", message: `交易平台返回错误信息：${orderRes.message}` };
            } else {
                newOrder.status = 'consign';
                newOrder.outerId = orderRes.outerId;
                newOrder = yield newOrder.save(newOrder);  
            }
        }

        let refreshAccountOptions = {
            userName: newOrder.userName, 
            symbol: newOrder.symbol,
            optionType: newOrder.optionType || 'call',
            leverage: newOrder.leverage || 1,
            site: newOrder.site, 
            price: newOrder.price, 

            amount: newOrder.amount,
            consignAmount: newOrder.consignAmount,  //委托数量
            bargainAmount: 0, //已成交数量
            bargainChangeAmount: 0, //已成交数量的变更数

            side: newOrder.side
        };

        let newAccount = yield* account.refreshAccountTrading(refreshAccountOptions,'create');
        if(!newAccount){
            //todo 应当能弥补
            return { isSuccess: false, errorCode: "100002", message: `找不到账户信息,账户信息同步失败，但是有可能进行交易。userName：${newOrder.userName}，site: ${newOrder.site}` };
        }

        return { isSuccess: true, actionId: newOrder._id,order: newOrder };
    }

    /**
     * 取消订单
     * 
     * @param {Order} order
     * @identifier {ClientIdentifier} identifier
     * @returns 如{ isSuccess: false, errorCode: "100006",message: "参数错误。order不能为空" }
     * @public
     */
    * cancelOrder(order,identifier){
        let api = new Api(identifier);

        if(!order){    
            return { isSuccess: false, errorCode: "100006",message: "参数错误。order不能为空" };
        } 

        if(["buy","sell"].indexOf(order.side) == -1){
            return { isSuccess: false, errorCode: "100006",message: "参数错误。order.side必须为buy或sell" };    
        }

        //先撤消原有委托
        let cancelOrderRes = yield api.cancelOrder(order.site,order.outerId);
        if(!cancelOrderRes.isSuccess){
            return { isSuccess: false, errorCode: "100005", message: `调用api撤消委托失败。${cancelOrderRes.message}` };
        }

        if(cancelOrderRes.isSuccess){
            ////这里有可能产生脏数据，应重新获取订单详情
            //let fetchOrderRes = yield api.fetchOrder({id: order.outerId,symbol: order.symbol});
            //if(fetchOrderRes.isSuccess){
            //    order.consignAmount = fetchOrderRes.order.consignAmount;
            //    order.bargainAmount = fetchOrderRes.order.bargainAmount;
            //} 

            //更改本地的委托
            //order.status = "canceled";
            order.status = "will_cancel";
            order.modified = Date.now();
            order = yield order.save();

            //let changeType = 'cancel';
            //let changeAmount = new Decimal(order.consignAmount).minus(order.bargainAmount).toNumber(); 
            //                    // order.consignAmount - order.bargainAmount;
            ////更新账户信息
            //let options = {
            //    userName: order.userName, 
            //    symbol: order.symbol,
            //    site: order.site, 
            //    price: order.price, 

            //    consignAmount: 0,
            //    bargainAmount: 0,
            //    bargainChangeAmount: changeAmount,

            //    side: order.side
            //};
            //yield* account.refreshAccountTrading(options, changeType);
        } 

        return { isSuccess: true };
    }

    
    
    /**
     * 尝试废掉未成功交易的委托，并提交新的委托
     *
     * @param {Order} order
     * @param {ClientIdentifier} identifier,可以为空
     * @param {Object} options,其他参数，如，
     * { priceRange: 0.2, //价格幅度容忍
     *   realPrices： []
     * }
     * @private
     * 
     */
    * retryOrder(order,identifier,options) {
        //当等待一定时间段后(这里设置为5分钟)，如果交易委托没有被执行，
        //（1）当前价格导致交易成本增加幅度超过1%，继续等待,直到人工处理或者行情变动后价格合适后操作
        //（2）当前价格导致交易成本没有增加或者增加幅度不超过1%（应当可以设置幅度），撤消交易委托，并且以当前价格申请新的交易委托。
        //（3）买入委托和卖出委托都应进行处理
        //todo 这里设置为5分钟,应当可以传入
        if(order.isTest){
            return { isSuccess: true };
        }

        let priceRange = options.priceRange || 0.2;

        if(!identifier){
            identifier = yield clientIdentifier.getUserClient(order.userName,order.site);
        }

        /*
         realPrices 实时行情.如
         { site: "A", symbol: "btc",
             details: [{ amount: 122, level: 1, price: 13 }, { amount: 122, level: 1, price: 12 }, { amount: 100, level: 1, price: 10 }, { amount: 100, level: 1, price: 9}]
         }; */
        let realPrice;
        if(!realPrice){
            realPrice = options.realPrices.find(function(value){
                return value.site == order.site && value.symbol == order.symbol;
            });
        }
        if(!realPrice){
            realPrice = yield* realTimePrice.getRealPrice(order.site,order.symbol);
        }

        let res = { isSuccess: false };
        if(!identifier || !realPrice){
            res.message = '系统错误';
            return res;
        }

        if(!priceRange){
            let strategy = yield Strategy.getUserStrategy(order.userName);
            if(strategy){
                priceRange = strategy.order.priceRange;
            }
        }

        var getConsignPrice = function (order) {
            let item = { price: 0, amount: 0 };
            let prices;
            if(order.side == "buy"){ //买入
                prices = realPrice.buys;
            } else if(order.side == "sell"){ //卖出 
                prices = realPrice.sells;
            }

            for(let price of prices){
                if(price.length < 2){
                    continue;
                }
                
                let itemPriceRange = new Decimal(price[0]).minus(order.price).abs().div(order.price).toNumber();
                              //Math.abs((price[0] - order.price) / order.price)
                if(itemPriceRange < priceRange){
                    item.price = price[0];
                    item.amount = new Decimal(item.amount).plus(price[1]).toNumber(); 
                    //item.amount +=  price[1];
                }
            }

            return item;
        }

        var consignPrice = getConsignPrice(order);
        if (consignPrice && consignPrice.price > 0) {
            res = yield* this._refreshConsignOrder(order,identifier,consignPrice);
        } else {
            res.isSuccess = false;
        }

        return res;
    }


    /**
     * 同步第三方交易平台和本系统间的订单状态,如果在一定时间内没有成交成功的委托，尝试重新提交新的委托
     *
     * @param {Object} options,参数,e.g.
       { 
          since: ((+new Date() - 8 * 60 * 60 * 1000) / 1000) | 0, //如果为空，则默认为8小时内
          sites: ['chbtc','btcorder']
       }
     * @param {Function(err, response)} stepCallBack
     * @public
     */
    * syncOrdersByInteval(options,stepCallBack) {
        let createdStart = new Date();

        options = options || {};
        let since = options.since || (((+new Date() - 8 * 60 * 60 * 1000) / 1000) | 0);
        createdStart.setTime(since); //8小时前

        let platforms = configUtil.getPlatforms();
        for(let platform of platforms){
            if(options.sites && options.sites.indexOf(platform.site) == -1){
                continue;
            }
            if(configUtil.getMethodType(siteItem.site,'market',1) != 'restful'){
                continue;
            }

            let syncSiteOrders = function(){
                let syncOptions = {
                    site: platform.site
                };
                this.syncOrders(syncOptions,stepCallBack);
            }.bind(this);

            let inteval = platform.syncOrdersInteval || DEFAULT_SYNC_INTEVAL;
            setInterval(syncSiteOrders, inteval);
        }
    }


    /**
     * 同步第三方交易平台和本系统间的订单状态,如果在一定时间内没有成交成功的委托，尝试重新提交新的委托
     *
     * @param {Object} options,参数,e.g.
       { 
          since: ((+new Date() - 8 * 60 * 60 * 1000) / 1000) | 0, //如果为空，则默认为8小时内
          site: 'btctrade' //为空时，同步全部网站的委托  
       }
     * @param {Function(err, response)} stepCallBack
     * @public
     */
    * syncOrders(options,stepCallBack) {
        let createdStart = new Date(),
            createdEnd = new Date();
        let orders;

        options = options || {};
        let since = options.since || (((+new Date() - 8 * 60 * 60 * 1000) / 1000) | 0);
        createdStart.setTime(since); //8小时前

        let filter = { 
            status:{ $in:['consign','part_success','will_cancel'] },
            consignDate: { $lt:createdEnd, $gt:createdStart }
        };
        if(options.site){
            filter.site = options.site;
        }

        //todo 这里要注意系统的健壮性
        //获取未成功并且未取消的委托  
        orders = yield Order.find(filter).sort({ userName: -1}); //todo 如果用户量大或者多服务器时，可以考虑改善这里的做法

        if(orders.length == 0){
            let stepRes = { 
                orders: orders,
                isSuccess: true, 
                message: "没有需要同步的订单",
                stepCount: 0
            };
            stepCallBack && stepCallBack(stepRes);
        }

        yield* this._syncRecentOrders(since,orders,stepCallBack);
    }

     /**
      * 处理一个用户的所有委托.如果在一定时间内没有成交成功的委托，尝试重新提交新的委托
      *
      * @param {Array(Order)} userOrders
      * @param {Object} identifier 
      * @param {Function(err, response)} stepCallBack，单个委托处理后的回调函数
      * @private
      */
    * syncUserRecentOrders(userName,sites,stepCallBack){
        let createdStart = new Date(),
            createdEnd = new Date();
        let since = ((+new Date() - 8 * 60 * 60 * 1000) / 1000) | 0; //8小时前
        createdStart.setTime(since) 
        //createdEnd.setTime( +new Date() - 0. * 1000 ) //0.1秒前
       
        //获取未成功并且未取消的委托
        let userOrders = { userName: "", orders: [] };          
        let orders = yield Order.find({ 
            userName: userName,
            site: { $in: sites },
            status:{ $nin:['success','canceled','auto_retry'] },
            created: { $lt:createdEnd, $gt:createdStart }
        }); 

        if(orders.length > 0){
            yield* this._syncRecentOrders(since,orders,stepCallBack);
        } else {
            let stepRes = { 
                userOrders: userOrders,
                isSuccess: true, 
                message: "没有需要同步的订单",
                stepCount: 0
            };
            stepCallBack && stepCallBack(null,stepRes);
        }
    }


    /**
     * 同步第三方交易平台和本系统间的订单状态,如果在一定时间内没有成交成功的委托，尝试重新提交新的委托
     *
     * @param {Function(response)} stepCallBack
     * @public
     */
    * _syncRecentOrders(since,orders,stepCallBack) {
        let userOrders = { userName: "", orders: [] };   

        //处理委托。如果在一定时间内没有成交成功的委托，尝试重新提交新的委托；如果在第三方交易平台交易成功，则应同步状态
        let isNextUser = false; //是否又切换到另外一个用户的委托
        for(let i = 0; i < orders.length; i++){
            
            //这里注意，先针对每个用户筛选出委托，然后对一个用户的所有委托，集中进行处理
            let order = orders[i];
            if(!userOrders.userName || order.userName == userOrders.userName){
                isNextUser = false;
            }else{
                userOrders.orders = [];
                isNextUser = true;
            }

            userOrders.userName = order.userName;
            userOrders.orders.push(order);
        
            if(isNextUser || i == orders.length - 1){ //已收集完一个用户的需要处理的委托
                try{
                    let identifiers = yield clientIdentifier.getUserClients(userOrders.userName); 
                    if(!identifiers){
                        continue;
                    }

                    let allSiteOrders = []; //数组项为用户某个网站的全部委托，如{ site: "huobi",orders:[]}
                    for(let userOrder of userOrders.orders){
                        let site = userOrder.site, item;
                        item = allSiteOrders.find(function(value){
                            return value.site == site;
                        });

                        if(!item){
                            item = { site: site, orders: [] };
                            allSiteOrders.push(item);
                        }
                        item.orders.push(userOrder); 
                    }

                    for(let siteOrders of allSiteOrders){
                        let identifier = identifiers.find(function(item){
                            return item.site == siteOrders.site;
                        });
                        if(identifier){
                            //处理一个用户某个网站的所有委托
                            yield* this._syncUserRecentOrders(since,siteOrders.orders,identifier);
                            stepCallBack && stepCallBack(null,{ 
                                userOrders: userOrders, 
                                isSuccess: true, 
                                message: `同步用户[${userOrders.userName}]的委托成功`
                            });
                        } else {
                            let stepRes = { 
                                userOrders: userOrders,
                                isSuccess: false, 
                                message: `同步用户[${userOrders.userName}]的委托失败,找不到授权信息`,
                                stepIndex: i, 
                                stepCount: orders.length 
                            };
                            stepCallBack && stepCallBack(null,stepRes);
                        }
                    }
                } catch(e) {
                    console.error(e);
                    let stepRes = { 
                        userOrders: userOrders,
                        isSuccess: false, 
                        message: `同步用户[${userOrders.userName}]的委托失败`,
                        stepIndex: i, 
                        stepCount: orders.length 
                    };
                    stepCallBack && stepCallBack(e,stepRes);
                }
            }
        }//for
    }

     /**
      * 处理一个用户的所有委托.如果在一定时间内没有成交成功的委托，尝试重新提交新的委托
      *
      * @param {Number}  since,秒级时间戳
      * @param {Array(Order)} userOrders
      * @param {Object} identifier 
      * @param {Function(err, response)} stepCallBack，单个委托处理后的回调函数
      * @private
      */
    * _syncUserRecentOrders(since,orders,identifier){
        let api = new Api(identifier);
        let outerOrders = [];
        
        //将委托按照币种分类
        let symbolsOrders = [];
        for(let order of orders){
            let item = symbolsOrders.find(function(value){
                return value.symbol == order.symbol;
            });
            if(item){
                item.orders.push(order);
            } else {
                symbolsOrders.push({
                    symbol: order.symbol,
                    orders: [order]
                });
            }
        }
        
        //获取委托的最新状态
        for(let symbolOrders of symbolsOrders){
            var options = {
                since: since, //8小时前
                symbol: symbolOrders.symbol,  //交易币种（btc#cny,eth#cny,ltc#cny,doge#cny,ybc#cny）
                type: 'all'  //  挂单类型[open:正在挂单, all:所有挂单]
            };
            let getOrdersRes = yield* api.fetchRecentOrders(options);
            if(!getOrdersRes.isSuccess || !getOrdersRes.orders){
                throw new Error(`获取第三方交易平台委托失败。${getOrdersRes.message}`); //todo待确认
            }
            outerOrders = [].concat(outerOrders,getOrdersRes.orders);
        }

        for(let order of orders){
            if(order.status == 'wait'){
                continue;
            }

            let outerOrder = outerOrders.find(function(value){
                return value.outerId == order.outerId;
            });

            if(!outerOrder && order.outerId){
                let getOrderRes = yield api.fetchOrder({id: order.outerId,symbol: order.symbol });
                if(getOrderRes.isSuccess){
                    outerOrder = getOrderRes.order;
                }
            }

            if(outerOrder){
                this.syncOrder(outerOrder,order,identifier);
            }
        }

        //todo 待确认
        // for(let outerOrder of outerOrders){
        //     let order = orders.find(function(value){
        //         return value.outerId == outerOrder.outerId;
        //     });

        //     outerOrder.userName = identifier.userName;
        //     if(!order){
        //         let order = this.getOrder(outerOrder);
        //         order = new Order(order);
        //         yield order.save();  
        //     } 
        // }
    }

    /**
     * 同步订单
     *
     * @param {Order} newOrder 系统存在的旧订单
     * @param {Order} {oldOrder} 新订单
     * @param {ClientIdentifier} [identifier] 用户授权信息
     * @api public
     */
    * syncOrder(newOrder,oldOrder,identifier){
        if(!oldOrder){
            oldOrder = yield Order.find({ outerId: oldOrder.id })
        }

        if(!oldOrder){
            oldOrder = newOrder;
        }

        if(!identifier){
            identifier = yield clientIdentifier.getUserClient(oldOrder.userName,oldOrder.site);  
            if(!identifier){
                throw new Error(`client为空.site:${oldOrder.site},userName:${oldOrder.userName}`);
                //return  { isSuccess: false, errorCode: "100003", message: "client为空" };              
            }
        }

        let changeAmount = new Decimal(newOrder.bargainAmount).minus(oldOrder.bargainAmount).toNumber(); //更改帐户的金额
        if(changeAmount > 0){
            yield* this.refreshOrder(oldOrder,newOrder,identifier);

            let e = { order: oldOrder,  changeAmount: changeAmount,status: newOrder.status };
            this.emit('change',e);
        } else {
            if(['wait','consign','part_success'].indexOf(oldOrder.status) != -1){
                let e = { order: oldOrder,  timeDelayed: +new Date() - (+order.consignDate),status: newOrder.status  };
                this.emit('delayed',e);
                //this.orderDelayedEvent.trigger(e);
            }
        }
    }

    getOrder(outerOrder){
        return {
            site: outerOrder.site, //平台名称
            userName: outerOrder.userName, 
            isTest: false,
            side: outerOrder.side, //buy或sell
            optionType: outerOrder.optionType || 'call',
            leverage: outerOrder.leverage || 1,

            reason: "outer", //原因
            symbol: outerOrder.symbol, //cny、btc、ltc、usd

            consignDate: outerOrder.consignDate, //委托时间
            price: outerOrder.price, //委托价格
            amount: outerOrder.consignAmount, //总数量
            consignAmount: outerOrder.consignAmount, //已委托数量
            bargainAmount: outerOrder.bargainAmount, //已成交数量
            status: status,
            isSysAuto: false,
            created: Date.now(), //创建时间
            modified: Date.now() //最近修改时间
        };
    }

    /**
     * 订单完成或完成部分后，对operateLog、account等进行相应处理
     * @param {Order} order
     * @param {Order} outerOrder,外部更新的委托交易
     * @returns {Boolean} 是否成功
     * @private
     */
    * refreshOrder(order,outerOrder,identifier){
        //{outerId: "423425", //挂单ID
        //datetime: new Date(),  //挂单时间
        //type: "buy",  //类型（buy, sell）
        //price: 100,  //挂单价格(单位为分)
        //consignAmount: 12, //挂单数量
        //bargainAmount: 20, //成交数量
        //status: 'canceled'}  //open(开放), closed(全部成交), canceled(撤消)

         //同步委托状态，碰到失败的或者是委托在一定时间(10分钟)后未交易的，根据市场价格重新提交一个委托

        try{  
            //if(['success','canceled','auto_retry','failed'].indexOf(order.status) != -1){
            //    //todo 因为获取的是外部网站的status为open的委托，
            //    //此时，应该是系统出问题了，最好记录下以便排查
            //    continue; 
            //}

            let orderStatus = order.status;
            if(outerOrder.status == 'canceled'){
                orderStatus = 'canceled';
            } else if(outerOrder.status == 'open'){
                orderStatus = (outerOrder.bargainAmount > 0 ? 'part_success' : 'consign');
            } else if(outerOrder.status == 'closed'){
                let leftAmt = new Decimal(outerOrder.consignAmount).minus(outerOrder.bargainAmount).toNumber();
                orderStatus = leftAmt > 0 ? 'canceled' : 'success'; //如果有未成交的部分，则为'canceled',否则为success
            }  


            //更新账户信息
            let changeType, //需要更改帐户的原因类型。为空时表示没有更改
                changeAmount = new Decimal(outerOrder.bargainAmount).minus(order.bargainAmount).toNumber(); //更改帐户的金额
            if(changeAmount > 0){ //委托被交易
                changeType = 'bargain';
            }

            if(orderStatus == 'canceled'){ //委托被取消
                changeType = 'cancel';
            } 

            if(changeType){
                let options = {
                    userName: order.userName, 
                    symbol: order.symbol,
                    side: order.side,
                    optionType: order.optionType || 'call',
                    leverage: order.leverage || 1,
                    site: order.site, 
                    price: order.price, 

                    amount: order.amount,
                    consignAmount: outerOrder.consignAmount,
                    bargainAmount: outerOrder.bargainAmount,
                    bargainChangeAmount: changeAmount
                };
                yield* account.refreshAccountTrading(options, changeType);
            }
                
            order.consignAmount = outerOrder.consignAmount;
            order.bargainAmount = outerOrder.bargainAmount;
            order.status = orderStatus;
            order.modified = new Date();
            yield order.save();
            
            return true;

        }catch(e){
            console.log(e);
            //todo 记录异常
            return false;
        }
    }


    /**
     * 获取在交易平台中某个交易品种，被使用货币可以使用的数量
     *
     * @param 
     */
    * getAvailableAmount(symbol,site,side){
        //todo
        return 0;
    }


    /**
     * 撤销未成交的委托，重新提交新的委托
     *
     * @param {Order} order
     * @param {ClientIdentifier} identifier
     * @consignPrice {Object} e.g.{ price: 10, amount: 10 }
     * @private
     */
    * _refreshConsignOrder(order,identifier,consignPrice){
        //let api = new Api(identifier);
        let bothApi = new BothApi(identifier);

        let res = { isSuccess: false };
        if(!order){
            res.errorCode = '100006';
            res.message = "order不能为空"
            return res;
        } 

        if(["buy","sell"].indexOf(order.side) == -1){
            res.errorCode = '100006';
            res.message = "order.side必须为buy或sell"
            return res;
        }

        //先撤消原有委托
        let cancelRes = yield* this.cancelOrder(order,identifier);
        if(!cancelRes.isSuccess){
            return cancelRes;
        }
      
        //todo 应注意系统的健壮性
        //生成一个新的委托 
        let leftAmount = new Decimal(order.consignAmount).minus(order.bargainAmount);
        let consignAmount = Math.min(consignPrice.amount,leftAmount);
        var newOrder = new Order({
            site: order.site, //平台名称
            userName: order.userName, 
            isTest: order.isTest,
            side: order.side, //buy或sell
            optionType: order.optionType || 'call',
            leverage: order.leverage || 1,
            reason: order.reason, //原因
            symbol: order.symbol, //cny、btc、ltc、usd
            consignDate: Date.now(), //委托时间
            price: consignPrice.price, //委托价格
            amount:  order.amount - order.bargainAmount, //总数量
            consignAmount: consignAmount, //已委托数量
            bargainAmount: 0, //已成交数量
            prarentOrder: order._id, //如果一定时间未成交成功，可能会针对这个委托以不同的价格重新发起一个新的委托，
                                                     //那末，新的委托的prarentOrder就为此委托.一个委托至多只会发起一个新的委托
            childOrder: null,   //如果一定时间未成交成功，可能会针对这个委托以不同的价格重新发起一个新的委托，
                                                     //那末，此委托的childOrder就为新委托

            bargains: [], //已成交列表
            actionId: order.actionId,
            //outerId: String,  //外部交易网站的Id
            queues:[], 
            status: "wait",
            isSysAuto: true,
            previousOrder: order.previousOrder,//前置交易
            nextOrder: order.nextOrder, //后置交易
            created: Date.now(), //创建时间
            modified: Date.now() //最近修改时间
        });

        newOrder = yield Order.create(newOrder);
        if(!newOrder){
            res.errorCode = '200000';
            res.message = "添加order失败"
            return res;
        }

        //更改本地的委托
        order.status = "auto_retry";
        order.modified = Date.now();
        order.childOrder = newOrder._id; 
        order = yield order.save();

        //向交易网站提交委托
        let apiRes;
        let apiOrder = {
            site: newOrder.site,
            symbol: newOrder.symbol,
            side: newOrder.side,
            optionType: newOrder.optionType || 'call',
            leverage: newOrder.leverage || 1,
            amount: consignAmount,
            price: newOrder.price
        };
        apiRes = yield bothApi.createOrder(apiOptions);

        if(apiRes.isSuccess){
            newOrder.outerId = apiRes.outerId;
            newOrder.consignAmount = apiOrder.amount;
            newOrder.consign = "consign";
            newOrder.modified = Date.now();
            newOrder = yield newOrder.save();

            //更新账户信息
            let changeType = 'create';
            let options = {
                userName: newOrder.userName, 
                symbol: newOrder.symbol,
                side: newOrder.side,
                optionType: newOrder.optionType || 'call',
                leverage: newOrder.leverage || 1,

                site: newOrder.site, 
                price: newOrder.price, 

                amount: newOrder.amount,
                consignAmount: newOrder.consignAmount,
                bargainAmount: 0,
                bargainChangeAmount: 0
            };
            yield* account.refreshAccountTrading(options, changeType);

        } else {
            res.errorCode = '100005';
            res.message = `调用api撤消委托失败。${apiRes.message}`;
            return res;
        }

        res.isSuccess = true;
        res.order = newOrder;
        return res;
    }

}

module.exports = new OrderController();