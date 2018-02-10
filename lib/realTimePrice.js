'use strict';
// const mongoose = require('mongoose');
// const RealTimePrice = mongoose.model('RealTimePrice');
// const RealTimePriceHistory = mongoose.model('RealTimePriceHistory');
// const SystemRunSettings = mongoose.model('SystemRunSettings');
// const DayPrice = mongoose.model('DayPrice');

const cacheClient = require('./apiClient/cacheClient').getInstance();
const BothApi = require('./apiClient/bothApi');
const configUtil = require('./utils/configUtil');
const symbolUtil = require('./utils/symbol');
const common = require('./common');
const symbolPriceUtil = require('./symbolPriceUtil');
const Decimal = require('decimal.js');

let realTimePrice = new class{
    
    /**
     * 获取交易品种价格
     * @param {String} site 
     * @param {String} symbol 
     * @param {Function} [getDepthPrice]
     */
    getSymbolPrice(site,symbol, maxStepsCount = 1, getDepthPrice){
        let symbols = configUtil.getSymbols(site);
        getDepthPrice = getDepthPrice || this._getAvgPrice;
        if(maxStepsCount < 1){
            maxStepsCount = 1;
        }

        let sameSymbol = symbols.find(t => t == symbol);
        if(sameSymbol){
            let getDepthsRes = cacheClient.getSymbolDepths(site);
            if(getDepthsRes.isSuccess){
                return {
                    isSuccess: true,
                    price: getDepthPrice(getDepthsRes.data,false)
                }
            }
        }

        //不存在直接的交易品种，尝试多个品种多次交易
        let getDepthsRes = cacheClient.getSymbolDepths(site);
        if(!getDepthsRes.isSuccess){
            return { isSuccess: false, message: `找不到网站${site}的行情信息` };
        }

        symbols.length = 0;
        let symbolDepths = getDepthsRes.data;
        for(let depth of symbolDepths){
            symbols.push(depth.symbol);
        }

        let getSymbolPathsRes = symbolPriceUtil.getSymbolPaths(symbol,symbols);
        if(!getSymbolPathsRes.isSuccess){
            return { isSuccess: false, message: `无法根据交易网站${site}的行情信息获取到交易品种${symbol}的价格` };
        }

        let symbolDepths = getSymbolPathsRes.paths;
        if(symbolDepths.length == 0 || symbolDepths.length > maxStepsCount){
            return { isSuccess: false, message: `受步数限制，无法根据交易网站${site}的行情信息获取到交易品种${symbol}的价格` };
        }

        let price = new Decimal(1);
        for(let symbolPath of symbolPaths){
            let getSymbolDepthRes = cacheClient.getSymbolDepths(site,symbolPath.symbol);
            let symbolDepth = getSymbolDepthRes.data;

            let symbolPrice = getDepthPrice(symbolDepth,symbolPath.reverse)
            if(symbolPath.reverse && symbolPrice != 0){
                symbolPrice = new Decimal(1).div(symbolPrice);
            }

            price = price.times(symbolPrice);
        }

        return { isSuccess: true, price: price }
    }

    _getAvgPrice(depth){
        return new Decimal(depth.bids[0][0]).plus(depth.asks[0][0]).div(2).toNumber();
    }

    _getReverseSymbolPrice(symbol,price){
        let symbolInfo = symbolUtil.getSymbolParts(symbol);
        let newSymbolParts = Object.assign({},symbolInfo,{
            targetCoin: symbolInfo.settlementCoin,
            settlementCoin: symbolInfo.targetCoin
        });

        let newSymbol = symbolUtil.getSymbolByParts(newSymbolParts);
        let newPrice = new Decimal(1).div(price).toNumber();
        
        return {
            symbol: newSymbol,
            price: newPrice
        }
    }

}();

module.exports = realTimePrice;

