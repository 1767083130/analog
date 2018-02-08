'use strict';
const configUtil  = require('../apiClient/configUtil');

/**
 * obsolate
 */
class FuturesApi {
    constructor(identifierOrSite){
        this.client = this._getClient(identifierOrSite);
    }

    /**
     * 获取即时价格
     * @Returns {Object}  e.g  { isSuccess: true,message: "",errorCode:
     *            result: { site:"houbi", buys: [[5,1],[4,1],[3,1],[2,1]], sells:[[10,1],[9,1],[8,1],[7,1]],symbol:"btc" } }
     */ 
    getRealPrice(symbol,callBack){
        return this.client.getRealPrice(symbol,callBack);
    }
 
    /**
     * 获取合约指数价格
     * 
     * @param {String} symbol 
     * @param {Function} callback 
     */
    getIndexPrice(symbol,callback){
        return this.client.getIndexPrice(symbol,callback);
    }
     

    /**
     * 获取每天的交易行情
     * @Returns {Object}  e.g  { isSuccess: true,message: "",errorCode:
     *            result: { site:"houbi", prices: [5,4,3,2],symbol:"btc" } }
     */ 
    getDayPrices(day,symbol){
        return this.client.getDayPrices(day,symbol);
    }

    /**
     * 获取结算历史数据
     *
     */
    getSettlement(symbol,startTime,endTime){
        return this.client.getSettlement(symbol,startTime,endTime);
    }
    
    /**
     * 获取合约资产信息
     */
    getBalance(symbol,callback){
        return this.client.getBalance(symbol,callback);
    }

    
    /**
     * 挂单
     * 
     * @param {Object} options  请求参数，如 
        {   symbol: "btc#cny", //币种
            side: 1, //订单类型 （1、开仓  2、平仓）,必填
            optionType: 1, //交易类型（1、买多  2、卖空）,必填
            money: 100, // 金额数量,与amount必填一个
            amount: 100, //数量
            price: 1,   //价格,必填
            leverage: 5,	//可填 杠杆倍数（BTC周: 5、10、20 BTC季: 5、10 LTC周:5、10、20）
            tradePassword: 'abcd',	//可填	资金密码（用户开启交易输入资金密码，需要传入资金密码进行验证）
            storeId: 0	 //可填	下单仓位（默认为 0）
        }
     * @param {function} callBack,回调函数
     * @returns {"result":true,"id":123} id: 挂单ID; result: true(成功), false(失败)
     */
    createOrder(options,callBack){
        return this.client.getHoldOrderList(options,callBack);
    }

    /**
     * 查询订单信息
     * 
     * @param {Object} options 挂单ID {id: 3423423,symbol: "btc#cny"}
     * @returns {Object} e.g. 
       { isSuccess: true, order:
       { id: 1,site: "btctrade",consignDate: '', type: 'buy',price: 12,consignAmount: 120,bargainAmount: 123,status: '状态：open(开放), closed(结束), cancelled(撤消)' } }
     */
    fetchOrder(options,callBack){
        return this.client.fetchOrder(options,callBack);
    } 

    /**
     * 获取用户持仓记录
     * @param {String} symbol,币种,.e.g "btc#cny"
     * @parma {Function} [callBack],回调函数
     */
    getHoldOrderList(symbol,callback){
        return this.client.getHoldOrderList(symbol,callback);
    }

    /**
     * 获取用户持仓记录（汇总）
     */
    getHoldOrder(symbol,callback){
        return this.client.getHoldOrderList(symbol,callback);
    }

    /**
     * 挂单查询
     * 
     * @param {Object} options  请求参数，如 {
     *    symbol: "btc#cny",  //交易币种,可为空（btc#cny,eth#cny,ltc#cny,doge#cny,ybc#cny）
     *    type: 'open',  //  挂单类型[open:正在挂单,可为空 all:所有挂单,默认为all]
     *    pageIndex: 0,  //页数。从0开始计数
     *    pageSize: 10   //每页大小。最大数为20
     * }
     * @returns { isSuccess: true,message: "", orders: [
        outerId: "423425", //挂单ID
        consignDate: new Date(),  //挂单时间
        site: "huobi",
        side: "buy",  //类型（buy, sell）
        price: 90,  //挂单价格(单位为元)
        consignAmount: 12, //挂单数量
        bargainAmount: 20, //成交数量
        status: 'canceled'  //open(开放), closed(全部成交), canceled(撤消)
       ]}
     */
    fetchOrders(options,callBack){
        /* NOTICE
         (1) 这里默认系统是每页查询20个数,如果不是,需要额外处理
         (2) 如果没有任何的历史订单,则只取两天内的
         */
        options.pageIndex = options.pageIndex || 0;
        options.pageSize = options.pageSize || 20;
        options.type = options.type || 'all';

        return this.client.fetchOrders(options,callBack);
    }


    /**
     * 获取最近的订单
     * 
     * @param {Object} options 请求参数，如 {
     *     symbol: "btc#cny",  //交易币种（btc#cny,eth#cny,ltc#cny,doge#cny,ybc#cny）
     *     since: +new Date() / 10000 | 0, //起始时间戳，since，lastOrderId必须填写一个
     *     lastOrderId: "1236549877", //最后一次同步时获取到的委托Id
     * }
     * 
     * @returns { isSuccess: true,message: "", orders: [
        outerId: "423425", //挂单ID
        consignDate: new Date(),  //挂单时间
        site: "huobi",
        side: "buy",  //类型（buy, sell）
        price: 90,  //挂单价格(单位为元)
        consignAmount: 12, //挂单数量
        bargainAmount: 20, //成交数量
        status: 'canceled'  //open(开放), closed(全部成交), canceled(撤消)
       ]}
     */
    * fetchRecentOrders(options,stepCallBack){
        if(!options.since && !options.lastOrderId){
            throw new Error('参数lastTime，lastOrderId必须填写一个');
        }

        /**
         * 不同的平台实现方式不同。如果能获取到最近全部成交订单，则不需要额外实现，否则需要另外实现
         */
        if(this.client.fetchRecentOrders){
            return yield* this.client.fetchRecentOrders(options,stepCallBack);
        } else {
            let fetchOrdersOptions =  {
                symbol: options.symbol,
                pageIndex: 0,  //页数。从0开始计数
                pageSize: 100   //每页大小 //NOTICE:不同的交易网站有可能有不同的限制，这个需要格外注意
            }
            
            let res = { isSuccess: true,orders: [] };
            let isContinue = true;
            while(isContinue){
                let fetchRes = yield this.fetchOrders(fetchOrdersOptions);
                stepCallBack && stepCallBack(null,fetchRes);

                if(fetchRes.isSuccess){
                    fetchOrdersOptions.pageIndex++;
                    if(fetchRes.orders.length != fetchOrdersOptions.pageSize){
                        isContinue = false;
                    } 

                    for(let order of fetchRes.orders){
                        if( (options.lastOrderId && order.outerId == options.lastOrderId)
                            || (options.since && +order.consignDate < +options.since)){
                            isContinue = false;
                            break;
                        } else {
                            res.orders.push(order);
                        }
                    }
                } else {
                    isContinue = false;

                    res.message = fetchRes.message;
                    res.errorCode = '100005';
                    return res;
                }
            }

            return res;
        }
    }



    /**
     * 取消挂单
     * 
     * @param {Object} options 挂单ID {id: 3423423,symbol: "btc#cny"}
     * @returns {"isSuccess":true,"message":"eewew"} id: 挂单ID; result: true(成功), false(失败)
     */
    cancelOrder(options,callBack){
        return this.client.cancelOrder(options,callBack);
    }

    /**
     * 获取被减仓订单
     * @param {String} symbol,币种
     * @param {Function} [callBack],回调函数，如果为空，则返回Promise
     */
    getSystemCloseOrders(symbol,callBack){
        return this.client.getSystemCloseOrders(symbol,callBack);
    }


    _getClient(identifierOrSite){
        let identifier,site;
        if(process.env.env == 'development'){
            site = 'test_site';
        } else {
            if(typeof identifierOrSite == 'string'){
                site = identifierOrSite;
                identifier = configUtil.getDefaultIdentifier(identifierOrSite);
            }else{
                identifier = identifierOrSite;
                site = identifier.site;
            }

            if(!identifier){
                return null;
            }
        }

        let siteClient = configUtil.getSiteClientConfig(site);
        if(!siteClient){
            throw new Error(`不支持的交易网站:${site}`);
        }
        let Client = siteClient.api;
        if(!Client){
            throw new Error(`不支持的交易网站:${site}`);
        }
        return new Client(identifier);
    }
}

module.exports = FuturesApi
