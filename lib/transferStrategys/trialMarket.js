'use strict';

const realTimePrice = require('../realTimePrice'),
      trialMarketSymbol = require('./trialMarketSymbol'),
      configUtil = require('../configUtil'),
      cacheClient = require('../apiClient/cacheClient').getInstance(),
      Decimal = require('decimal.js');
const debug = require('debug')('analog:transferStrategys:trialMarket')

let trialMarket = new class{

    * trialNoLimit(){
        let resItems = [],
            platforms = configUtil.getPlatforms();
        for(let i = 0; i < platforms.length; i++){
            let platformA = platforms[i];
            for(let j = i + 1; j < platforms.length; j++){
                let platformB = platforms[j];
                let item = yield* this.trialPairNoLimit(platformA.site,platformB.site);
                resItems.push(item);
            }
        }

        return resItems;
    }

    * trialLimit(){
        let resItems = [],
            platforms = configUtil.getPlatforms();
        for(let i = 0; i < platforms.length; i++){
            let platformA = platforms[i];
            for(j = i + 1; j < platforms.length; j++){
                let platformB = platforms[j];
                let item = yield* this.trialPairLimit(platformA.site,platformB.site);
                resItems.push(item);
            }
        }

        return resItems;
    }

    /**
     * 
     * @param {*} siteA 
     * @param {*} siteB 
     * @param {*} realPrices 
     * @param {*} includeUnvalid 
     */
    * trialPairNoLimit(siteA,siteB,realPrices,includeUnvalid){
       /*关于这个方法的思路，每个路径（PathPair）按两步执行
       （1）顺路径做差价
       （2）再将两条路径都反转

        symbolPathPair的数据格式： { 
            siteA: "baidu",symbolPathA: [{symbol:"eos#usd",reverse: true}], 
            siteB: "qq", symbolPathB: [{symbol:"eos#usd",reverse: false}]}
        */
        let items = [];

        if(!realPrices){
            realPrices = [];
            let siteA_realPrices = yield* realTimePrice.getRealPrice(siteA,'*');
            let siteB_realPrices = yield* realTimePrice.getRealPrice(siteB,'*');
            if(!siteA_realPrices){
                return { isSuccess: false,message: `获取网站${siteA}的行情深度失败`}
            }
            if(!siteB_realPrices){
                return { isSuccess: false, message: `获取网站${siteB}的行情深度失败`}
            }

            //获取行情信息有可能偶尔获取不到，这时不应该往下运行
            realPrices = realPrices.concat(siteA_realPrices);
            realPrices = realPrices.concat(siteB_realPrices);
        }

        let symbolPathPairsRes = trialMarketSymbol.getSymbolPathPairs(siteA,siteB,realPrices);
        if(!symbolPathPairsRes.isSuccess){
            return symbolPathPairsRes;
        }

        let symbolPathPairs = symbolPathPairsRes.symbolPathPairs;
        for(let symbolPathPair of symbolPathPairs){ 
            //顺路径计算差价
            let profitRes0 = this._getSymbolsProfit(symbolPathPair,realPrices);

            //将路径反转后计算差价
            let reverseSymbolPathPair = trialMarketSymbol.getReverseSymbolPathPair(symbolPathPair);
            let profitRes1 = this._getSymbolsProfit(reverseSymbolPathPair,realPrices);

            if(!profitRes0.isSuccess || !profitRes1.isSuccess){
                items.push(profitRes0);
                continue;
            }
            if(profitRes0.valid || includeUnvalid){
                items.push(profitRes0);
            }
            if(profitRes1.valid || includeUnvalid){
                items.push(profitRes1);
            }
        }

        return items;   
    }

    * trialPairLimit(siteA, siteB, realPrices, limitProfit, includeUnvalid){
        let priceA, priceB;

        if(!realPrices){
            realPrices = [];
            let siteA_realPrices = yield* realTimePrice.getRealPrice(siteA,'*');
            let siteB_realPrices = yield* realTimePrice.getRealPrice(siteB,'*');

            //todo 获取行情信息有可能偶尔获取不到，这时不应该往下运行
            realPrices = realPrices.concat(siteA_realPrices);
            realPrices = realPrices.concat(siteB_realPrices);
        }

        let variables = this._getVariables(symbolPair,realPrices);
        for(let symbolPathA of symbolPair.symbolPathA){

        }
        for(let symbolPathB of symbolPair.symbolPathB){

        }

        var indexs = [], //行情价格中的索引
        amounts = [], //能符合条件的委托价格
        len = variableValues.length;

        for(var i = 0; i < len; i++){
            indexs[i] = 0;
            //amounts[i] = variableValues[i].values[0][1]; //[1]
        }

        var isAllEnd = function(){
            for(var i = 0; i < len; i++){
                var isEnd = (indexs[i] == variableValues[i].values.length);
                if(!isEnd){
                    return false;
                }
            }

            return true;
        }
        
        //获取符合条件的委托数量最小的一方.
        var getMinAmountItem = function() {
            if(amounts.length == 0){
                return -1;
            }

            var min = Math.max.apply(null,amounts), //amounts[0],
                minIndex = -1;
            for(let i = 0; i < amounts.length; i++){
                if (min >= amounts[i] &&  //取较小者
                    indexs[i] < variableValues[i].values.length - 1) { //数组索引不能超界限
                    min = amounts[i];
                    minIndex = i;
                }
            }

            return minIndex;
        }

        var lastIndex = 0, //上一次推进的数组项
            isFirst = true, //是否为第一次运行，需要保证判断条件语句运行一次
            fixed = false;  //是否符合运行条件
        while (isFirst || !isAllEnd()) {
            var expressNew,
                minItem = 0;

            var stackNew = [],
                conditionRealPrices = []; //

            //获取需要用到的即时价格信息
            for(let i = 0; i < len; i++){
                let index = indexs[i];
                let price = variableValues[i].values[index][0];
                let amount = variableValues[i].values[index][1];

                conditionRealPrices.push({
                    site: variableValues[i].site, 
                    symbol: variableValues[i].symbol,
                    price: price,
                    amount: amount,
                    side: variableValues[i].side
                });
            }
            
            var getVarValueMethod = function* (stackItem){ //todo 待确认
                return this.getStackItemValue(stackItem,conditionRealPrices,envOptions);
                //return yield* super.getStackItemValue(stackItem,conditionRealPrices,env);
            }.bind(this);

            //将表达式的变量用值替换掉,形成一个新的堆栈
            for(let j = 0; j < stack.length; j++){
                let stackItem = stack[j];

                //getStackItemValue 返回的值:
                //{ value: 8, type: 'method' } //value:处理后返回的值 type:表达式类型
                let stackItemValue =  yield* this.getStackItemValue(stackItem,conditionRealPrices,envOptions); // 
                if(stackItemValue.type == 'method'){
                    let options = {
                        getVarValueMethod: getVarValueMethod
                        //env: envOptions.env
                    };

                    let methodsRunner = new MethodsRunner(options);
                    let val = yield* methodsRunner.calculate(stackItem);
                    stackNew.push(val);
                } else {
                    stackNew.push(stackItemValue.value);
                }
            }

            //新的可以执行的表达式
            expressNew = stackNew.join('');

            //计算表达式的值，只要返回false,则终止运行,否则推进数组indexs
            var res;
            try{
                res = eval(expressNew);
            } catch(e) {
                res = false;
            }

            if(res){
                fixed = true;
            }

            if(variableValues.length > 0){
                if (res) {
                    if (isFirst) {
                        for (let m = 0; m < len; m++) {
                            amounts[m] = variableValues[m].values[0][1]; //[1]
                        }
                    }

                    if (indexs[lastIndex] > 0) {
                        var level = indexs[lastIndex];
                        amounts[lastIndex] = new Decimal(amounts[lastIndex]).plus(variableValues[lastIndex].values[level][1]).toNumber();
                        //amounts[lastIndex] += variableValues[lastIndex].values[level][1];
                    }

                    //推进数组indexs
                    minItem = getMinAmountItem();
                    lastIndex = minItem;
                
                    if (minItem != -1) {
                        indexs[minItem]++;
                    } else {
                        //amounts[lastIndex] += variableValues[lastIndex].values[level][1];
                        break;
                    }
                } else {
                    if (isFirst) {
                        for (let m = 0; m < len; m++) {
                            amounts[m] = 0;
                        }
                    } else {
                        indexs[lastIndex]--;
                    }

                    break;
                } //if (res) {
            } //if(variableValues.length > 0){

            isFirst = false;
        } //while

        let period,
           minus = new Decimal(priceA).minus(priceB);
        if(minus.greaterThan(0)){
            period = minus.div(priceA).times(100);
        } else {
            period = minus.div(priceB).times(100);
        }

        return {
            fixed: fixed,
            amounts: amounts,
            orders: conditionOrders,
            indexs: indexs, 
            variableValues: variableValues 
        };
        //return conditionOrders;

        return { 
            siteA: siteA,
            symbolA: symbolA,
            siteB: siteB,
            symbolB: symbolB,
            period: period 
        };
    }

    _getSymbolsProfit(symbolPathPair,realPrices){
        /*关于这个方法的思路，这里举一个实例：
        （1）顺路径做差价
          siteA: eos -> usd 表示用eos买进usd，那么priceA相当于1个eos能买多少个usd
          siteB: usd -> eos 表示用usd买进eos，那么priceB相当于1个eos能卖多少个usd
          然后比较priceA和priceB的价格，如果priceA < priceB,那么说明这个路径是有利可图的
       （2）再将两条路径都反转
          siteA: usd -> eos 表示用usd买进eos，那么priceA相当于1个usd能买多少个eos
          siteB: eos -> usd 表示用eos买进usd，那么priceB相当于1个usd能卖多少个eos
          然后比较priceA和priceB的价格，如果priceA < priceB,那么说明这个路径是有利可图的
        */
        let priceA = new Decimal(1), priceB = new Decimal(1);
        let item = { 
            siteA: symbolPathPair.siteA,
            symbolPathA: symbolPathPair.symbolPathA,
            siteB: symbolPathPair.siteB,
            symbolPathB: symbolPathPair.symbolPathB,

            /**下面的变量需要重新计算，这里列出来只是为了说明数据结构 */
            period: 0,
            isSuccess: false,
            valid: false //这条路径是有利可图的
        };

        let variablesRes = this._getVariables(symbolPathPair,realPrices);
        if(!variablesRes.isSuccess){
            item.isSuccess = false;
            item.message = variables.message;

            return item;
        }

        let variables = variablesRes.variables;
        for(let symbolItem of symbolPathPair.symbolPathA){
            let variableItem = variables.find(p => p.symbol == symbolItem.symbol && p.site == symbolPathPair.siteA);
            if(symbolItem.reverse){
                priceA = priceA.div(variableItem.values[0][0]); 
            } else {
                priceA = priceA.times(variableItem.values[0][0]); 
            }
        }
        for(let symbolItem of symbolPathPair.symbolPathB){
            let variableItem = variables.find(p => p.symbol == symbolItem.symbol && p.site == symbolPathPair.siteB);
            if(!symbolItem.reverse){
                priceB = priceB.div(variableItem.values[0][0]);
            } else {
                priceB = priceB.times(variableItem.values[0][0]);
            }
        }

        let period,
           minus = new Decimal(priceA).minus(priceB);
        if(minus.greaterThan(0)){ //如果 priceA > priceB
            period = minus.div(priceA).times(100);
            item.valid = false; //这条路径是无利可图的
        } else {
            period = minus.div(priceB).times(100);
            item.valid = true; //这条路径是有利可图的
        }

        item.period = Math.abs(+period.toFixed(2));
        item.isSuccess = true;
        
        return item;
    }

    _getVariables(symbolPair,realPrices){
        let realPrice, 
            symbolItems = this._getSymbolItems(symbolPair);
        let variables = [];
        for(let symbolItem of symbolItems){
            realPrice = realPrices.find(p => p.site == symbolItem.site && p.symbol == symbolItem.symbol);
            if(!realPrice){
                return { isSuccess: false, message: `获取不到市场行情 site:${symbolItem.site},symbol:${symbolItem.symbol}`}
            }

            //let side = (+reverse | +symbolItem.reverse == 1) ? 'sell' : 'buy';
            let side = (symbolItem.reverse ? 'sell' : 'buy');
            let variableValues = (side == 'buy' ? realPrice.sells : realPrice.buys);
            variables.push({ 
                symbol: symbolItem.symbol,
                site: symbolItem.site,
                side: side,
                values: variableValues
            });
        }

        return { isSuccess: true,variables: variables };
    }

    /**
     * 获取符合条件表达式的交易数量以及价格等信息
     *
     * 
     * @returns 返回满足条件的委托信息. 数据格式为，
          { fixed: fixed,orders: conditionOrders,variableValues: variableValues, indexs: indexs, amounts: amounts } 
        如：{ fixed: true,orders: [{ symbol: "btc#cny",site: "btctrade", side: "buy",amount: 109,price: 6789 }]
          }
     *
     * @public
     */
    * getConditionResult(condition,envOptions) {
        throw new Error('调用了没有实现的方法');
    }


            //     siteA: pathPair.siteA,
        //     siteB: pathPair.siteB,
        //     symbolPathA: symbolsA_info.symbolPath,
        //     symbolPathB: symbolsB_info.symbolPath

    /**
     * 获取symbolPair中所包含的所有symbol
     * 
     * @param {Object} symbolPair e.g { siteA: "qq",siteB: "baidu",symbolPathA: [{ symbol: "bch#btc",reverse: false},{ symbol: "bch#eos", reverse: true }],symbolPathB:[]}
     * @param {String} [site] 网站，如果为空，表示获取两个网站的所有symbol 
     * @returns {Array} e.g [{site:"qq",symbol: "bch#btc",reverse: false},{site: "baidu",symbol: "bch#btc",reverse: false}]
     */
    _getSymbolItems(symbolPair,site){
        let symbolItems = [];
        if(!site || site == symbolPair.site){
            for(let symbolItem of symbolPair.symbolPathA){
                symbolItems.push({
                    site: symbolPair.siteA,
                    symbol: symbolItem.symbol,
                    reverse: symbolItem.reverse
                });
            }
        }

        if(!site || site == symbolPair.site){
            for(let symbolItem of symbolPair.symbolPathB){
                symbolItems.push({
                    site: symbolPair.siteB,
                    symbol: symbolItem.symbol,
                    reverse: symbolItem.reverse
                });
            }
        }

        return symbolItems;
    }

    _getTestData(){
        let symbolPaths = {
            siteA: "1",
            symbolPathA: [
                { symbol: "", type: "buy"},
                { symbol: "", type: "sell"}
            ],
            siteB: "2",
            symbolPathB: [
                { symbol: "", type: "buy"}
            ]
        }

        return symbolPaths;
    }

}();

module.exports = trialMarket;  