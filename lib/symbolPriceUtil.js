const Decimal = require('decimal.js');
const configUtil = require('./utils/configUtil');
const symbolUtil = require('./utils/symbol');
//const realTimePrice = require('./realTimePrice'); 

const Natural_Symbol = configUtil.getBusiness().natural; //本位币 //TODO

/** 图算法相关 */
const root = require('algorithms'),
    dijkstra = root.Graph.dijkstra,
    Graph = root.DataStructures.Graph;

let symbolPriceUtil = new class{
 
    /**
     * 获取根据交易策略调整各个币种仓位和整体持仓所要做的交易列表
     *
     * @param {Strategy} strategy, 交易策略
     * @param {Account} accountInfo, 帐户信息 
     * @return {String}
     * @api private
     */
    _getStrategyOrders(strategy,accountInfo){
        //todo
        //调整整体仓位    
        let sellAmount = 0;  //需要买入或卖出的总额      
        var total = accountInfo.totalStock + accountInfo.availableNaturalCoin;
        var totalPercent = (accountInfo.totalStock / total * 100) | 0;
        if(totalPercent != strategy.totalPercent){ //调整整体
            sellAmount = (total * (strategy.totalPercent - totalPercent) / 100) | 0;
        }

        var orders = [];
        //调整每个币种的情况
        for(var item of accountInfo.symbols){ //每个币种
            if(item.symbol == Natural_Symbol){
                continue;
            }

            let strategyItem = strategy.stocks.find(function(value){
                return value.symbol == item.symbol;
            });
            // if(!strategyItem){ //todo
            //     continue;
            // }

            let itemPercent = item.price / total * 100;
            let amount =  ((strategyItem.amount - itemPercent) * this.getSymbolPrice(item.symbol)) | 0;

            var order = {        
                site: "", //还需要根据行情来确定 //todo
                userName: strategy.userName,
                total: 0,	//总资产折合
                amount:  Math.abs(amount), //金额
                price: 0,  //价格 
                type: amount > 0 ? "buy" : "sell", //交易类型。buy或sell
                reason: "调仓", //原因
                symbol: item.symbol //cny、btc、ltc、usd
            };
            orders.push(order);    
        }

        return orders;
    }

    /**
     * 获取用户的资产总值 
     * 
     * @param {String} userName 用户名
     * @param {String} site 网站名
     * @param {String} [settlementCoin] 结算货币。默认为btc
     * @param {Number} [leftDiscount] 如果市场不能承受账户余额数的卖压，剩余的量在已计算的价格上打几折。默认为1
     */
    getUserAssetValue(userName,site,settlementCoin,leftDiscount){

    }

    /**
     * 获取资产总值
     * 
     * @param {*} coinItems 
     * @param {*} settlementCoin 
     * @param {*} leftDiscount 
     * @param {*} realPrices 
     */
    _getAssetValue(coinItems,positions,settlementCoin,leftDiscount,realPrices){

    }


    /**
     * 获取在某个网站中，卖出一定数量的交易品种，市场能给出的价格
     * 
     * @param {String} [site] 网站名称.参数site和realPrices两者不能全为空
     * @param {String} symbol 交易品种
     * @param {Number} amount 需要卖出的数量，默认为0
     * @param {String} [side] 进行套利时需进行的交易类型，值为buy or sell,如果没有设置，则默认为sell
     * @param {Number} [leftDiscount] 如果市场不能承受数量为参数amount的卖压，剩余的量在已计算的价格上打几折。默认为1
     * @param {Object} [realPrices] 市场价格信息,如果参数为空，会自动读取当前的市场价格
     */
    * getMarketPrice(site,symbol,amount,side,leftDiscount,realPrices){
        // if(!realPrices){
        //     realPrices = yield* realTimePrice.getRealPrice(site,symbol)
        // }
        if(!realPrices){
            return { avgPrice: 0, amount: 0, fixed: false };
        }
        
        leftDiscount = leftDiscount || 1;
        amount = amount || 0;
        let priceItems = (side == 'buy' ? realPrices.sells : realPrices.buys);
        let leftAmount = new Decimal(amount),
            stepAmount = new Decimal(amount),
            totalAsset = new Decimal(0);
        for(let sellItem of priceItems){
            let itemPrice = sellItem[0],
                itemAmount =  sellItem[1];
            //min(itemAmount,leftAmount)
            stepAmount = leftAmount.greaterThan(itemAmount) ? itemAmount : leftAmount;
            leftAmount = leftAmount.minus(stepAmount);
            totalAsset = totalAsset.plus(new Decimal(itemPrice).times(stepAmount)); 

            if(leftAmount.lessThanOrEqualTo(0)){
                break;
            }
        }

        let assetAmount = new Decimal(amount).minus(leftAmount);
        let avgPrice = new Decimal(totalAsset).div(assetAmount); //表示根据获取到的市场价格，能卖出数量资产的平均价格
        let price = avgPrice; //对不能成交的部分进行折让后计算得到的每单位的资产价格

        if(leftAmount.greaterThan(0)){
            //price = (leftAmount * avgPrice * leftDiscount + totalAsset) / amount;
            price = leftAmount.times(avgPrice).times(leftDiscount).plus(totalAsset).div(amount);
        }

        let symbolParts = symbolUtil.getSymbolParts(symbol,site);
        return {
            price: price.toNumber(),  //对不能成交的部分进行折让后计算得到的每单位的资产价格
            avgPrice: avgPrice.toNumber(), //表示根据获取到的市场价格信息，能卖出数量资产的平均价格
            amount: assetAmount.toNumber(), //表示根据获取到的市场价格信息，能卖出的数量
            settlementCoin: symbolParts.settlementCoin,
            fixed: assetAmount.greaterThanOrEqualTo(amount) //表示根据获取到的市场价格，是否能全部成交
        };
    }

    getSiteCoinPricePath(site,settlementCoin){
        let symbols = [];
        let siteConfig = configUtil.getPlatform(site);
        for(let symbolItem of siteConfig.symbols){
            symbols.push(symbolItem.symbol);
        }

        return this.getCoinPricePath(symbols,settlementCoin);
    }

    /**
     * 获取价格
     * 
     * @param {*} settlementCoin 
     * @param {Array} avgPrices e.g.  [{ symbol: "btc#cny", side: "buy", price: 1234 }]
     * @returns { 
     *    settlementCoin: "btc",   //结算货币
     *    price: 13423   //计算得出的价格
     *  }
     * @api public
     */
    getSymbolPrice(symbol,avgPrices){
        let symbols = [];
        for(let symbolPrice of avgPrices){
            symbols.push(symbolPrice.symbol);
        }
    
        let symbolParts = symbolUtil.getSymbolParts(symbol);
        if(symbolParts.settlementCoin == symbolParts.targetCoin){
            return { isSuccess: true,settlementCoin: symbolParts.targetCoin,price: 1 };
        }

        let pricePath = this.getCoinPricePath(symbols,symbolParts.settlementCoin);
        if(!pricePath.isSuccess){
            return pricePath;
        }

        let isEnd,priceDecimal,
            currentCoin = symbolParts.targetCoin;
        while(!isEnd){
            let previousCoin = pricePath.previous[currentCoin];
            if(!previousCoin){
                return {
                    isSuccess: false,
                    message: '无法计算币种市场价格，请检查交易条件表达式是否合理'
                };
            }

            if(currentCoin && previousCoin){
                let previousSymbolParts = Object.assign({},symbolParts,{
                    targetCoin: currentCoin,
                    settlementCoin: previousCoin
                });
                let previousSymbol = symbolUtil.getSymbolByParts(previousSymbolParts);
                let symbolPriceInfo = avgPrices.find(item => item.symbol == previousSymbol);
                priceDecimal = new Decimal(priceDecimal ? priceDecimal : 1).times(symbolPriceInfo.price);
            }
            
            isEnd = (previousCoin == symbolParts.settlementCoin);
            //lastCoin = currentCoin;
            currentCoin = previousCoin; 
        }

        return {
            isSuccess: true,
            settlementCoin: pricePath.coreCoin,
            price: priceDecimal.toNumber()
        };
    }
    

    /**
     * 
     * @param {*} symbol 
     * @param {*} symbols 
     */
    getSymbolPaths(symbol,symbols){
        let symbolParts = symbolUtil.getSymbolParts(symbol);
        if(symbolParts.settlementCoin == symbolParts.targetCoin){
            throw new Error('symbol中的两个币种不能相同');
        }

        let pricePath = this.getCoinPricePath(symbols,symbolParts.targetCoin);
        if(!pricePath.isSuccess){
            return pricePath;
        }

        let isEnd,priceDecimal,paths = [],
            currentCoin = symbolParts.settlementCoin;
        while(!isEnd){
            let previousCoin = pricePath.previous[currentCoin];
            if(!previousCoin){
                return {
                    isSuccess: false,
                    message: '无法计算币种市场价格，请检查交易条件表达式是否合理'
                };
            }

            if(currentCoin && previousCoin){
                let previousSymbolParts = Object.assign({},symbolParts,{
                    targetCoin: previousCoin,
                    settlementCoin: currentCoin
                });
                let previousSymbol = symbolUtil.getSymbolByParts(previousSymbolParts);
                let symbolItem = symbols.find(t => t == previousSymbol);
                if(!symbolItem){
                    //将结算币种和目标币种进行反转
                    previousSymbolParts = Object.assign({},symbolParts,{
                        targetCoin: previousCoin,
                        settlementCoin: currentCoin
                    });
                    previousSymbol = symbolUtil.getSymbolByParts(previousSymbolParts);

                    paths.push({
                        symbol: previousSymbol,
                        reverse: true
                    });
                } else {
                    paths.push({
                        symbol: previousSymbol,
                        reverse: false
                    });
                }
            }
            
            isEnd = (previousCoin == symbolParts.targetCoin);
            currentCoin = previousCoin; 
        }

        return {
            isSuccess: true,
            paths: paths
        };
    }
        
    /**
     * 获取币的价格需要的路径
     * 
     * @param {Array} symbols, 可以确定价格的交易品种 e.g. ['btc#cny','eth#btc']
     * @param {String} settlementCoin 结算币种
     * @returns 返回前置货币关系 e.g.  { cny: "btc",eth: "btc" },表示如果需要计量cny的价格，必须先知道btc价格
     */
    getCoinPricePath(symbols,settlementCoin){
        var coins = [],
            coinsGraph = new Graph();
        for(var i = 0; i < symbols.length; i++){
            let symbolInfo = symbolUtil.getSymbolParts(symbols[i]);
            coinsGraph.addEdge(symbolInfo.targetCoin, symbolInfo.settlementCoin, 1);
            coinsGraph.addEdge(symbolInfo.settlementCoin, symbolInfo.targetCoin, 1);

            coins.push(symbolInfo.targetCoin);
            coins.push(symbolInfo.settlementCoin);
        }          

        if(coins.indexOf(settlementCoin) == -1){
            return { isSuccess: false, message: `无法通过参数symbols关联到结算货币${settlementCoin}`}
        }

        var shortestPath = dijkstra(coinsGraph, settlementCoin);
        let previous = shortestPath.previous;
        // for(let key in previous){
        //     previous[previous[key]] = key;
        // }
        
        return {
            isSuccess: previous,
            coreCoin: settlementCoin,
            previous: previous
        } ;
    }
}();

module.exports = symbolPriceUtil;