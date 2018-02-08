'use strict';
const configUtil  = require('../utils/configUtil');
const symbolUtil  = require('../utils/symbol');

/**
 * obsolate
 */
class BothApi {
    constructor(identifierOrSite){
        if(typeof identifierOrSite == 'string'){
            this.identifier = { site: identifierOrSite };
        } else {
            this.identifier = identifierOrSite;
        }
    }

    /**
     * 获取即时价格
     */
    getRealPrice(symbol,callback){
        let symbolInfo = symbolUtil.getFullSymbol(symbol,this.identifier.site);
        let api = this.getApi(this.identifier,symbolInfo.contractType);
        
        let res = api.getRealPrice(symbol,callback);
        return res;
    }

    /**
     * 挂单
     * 
     * @param {Object} options  请求参数，如 
        {   symbol: "btc#cny", //币种
            side: "buy", //交易类型 buy(买入或者期货中的开仓)或sell(卖出或者期货中的平仓)。当action=trade时有效
            optionType: "call", //操作类型 （call: 看涨期权  put:看跌期权）
            //money: 100, // 金额数量,与amount必填一个
            amount: 100, //数量
            price: 1,   //价格,必填
            leverage: 5,	//可填 杠杆倍数（BTC周: 5、10、20 BTC季: 5、10 LTC周:5、10、20）
            tradePassword: 'abcd',	//可填	资金密码（用户开启交易输入资金密码，需要传入资金密码进行验证）
            storeId: 0	 //可填	下单仓位（默认为 0）
        }
     * @param {function} callBack,回调函数
     * @returns {"result":true,"id":123} id: 挂单ID; result: true(成功), false(失败)
     */
    createOrder(options,callback){
        let symbolInfo = symbolUtil.getFullSymbol(options.symbol,this.identifier.site);
        let api = this.getApi(this.identifier,symbolInfo.contractType);

        let res;
        if(symbolInfo.contractType == 'spot'){
            //res = api.getRealPrice(symbol,callback);
            if(options.side == 'sell'){
                res = api.sell(options,callback);
            } else if(options.side == 'buy'){
                res = api.buy(options,callback);
            }
        } else {
            res = api.createOrder(options,callback);
        }

        return res;
    }

    /**
     * 取消挂单
     * 
     * @param {Object} options 挂单ID {id: 3423423,symbol: "btc#cny" }
     *    options.id 必须
     *    options.symbol 必须
     * @returns 
        {
            "result":"success",  //成功状态
            isSuccess: true,
            "code": 0
        }
     */
    cancelOrder(options,callBack){
        let symbolInfo = symbolUtil.getFullSymbol(options.symbol,this.identifier.site);
        let api = this.getApi(this.identifier,symbolInfo.contractType);
        let res = api.cancelOrder(options,callBack);
        return res;
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
        let symbolInfo = symbolUtil.getFullSymbol(options.symbol,this.identifier.site);
        let api = this.getApi(this.identifier,symbolInfo.contractType);
        let res = api.fetchRecentOrders(options,stepCallBack);
        return res;
    }

    /**
     * 挂单查询
     * 
     * @param {Object} options  请求参数，如 {
     *    symbol: "btc#cny",  //交易币种,可为空（btc#cny,eth#cny,ltc#cny,doge#cny,ybc#cny）
     *    type: 'open',  //  挂单类型[open:正在挂单,可为空 all:所有挂单,默认为all]
     *    pageIndex: 0,  //页数。从0开始计数
     *    pageSize: 10   //每页大小。
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
        let symbolInfo = symbolUtil.getFullSymbol(options.symbol,this.identifier.site);
        let api = this.getApi(this.identifier,symbolInfo.contractType);
        let res = api.fetchOrders(options,callBack);
        return res;
    }

    getApi(identifier,contractType){
        contractType = contractType || 'spot';
        let Client;
        let siteClient = configUtil.getSiteClientConfig(identifier.site);
        if(!siteClient){
            throw new Error(`不支持的交易网站:${identifier.site}`);
        }


        if(contractType == 'spot'){
            Client = siteClient.api;
        } else {
            Client = siteClient.futuresApi;
        }

        if(!Client){
            throw new Error(`交易网站${identifier.site}不支持${contractType}`);
        }

        return new Client(identifier);
    }
}

module.exports = BothApi
