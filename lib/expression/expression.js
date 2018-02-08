'use strict';

const configUtil = require('../utils/configUtil');
const symbolUtil = require('../utils/symbol');
const MethodsRunner = require('./methodsRunner');
const realTimePrice =  require('../realTimePrice');
const feeUtil = require('../fee');
const account = require('../account');
const futureIndex = require('../futureIndex');
const common = require('../common');

const arithmeticOperators = ['+','-','*','/','\\','[',']', '(',')','?',':','&&', '||','&','|'];
const conditionOperators = ['>=','<=','==','!=','>','<','='];
const operators = arithmeticOperators.concat(conditionOperators);
const Decimal = require('decimal.js');

/**
 * 条件表达式
 */
let expression = new class {
    
    /**
     * 获取所有策略条件表达式公用的变量值(有些变量值是与特定表达式相关的.如 huobi.eth#btc.buy,这里不能获取到)
     * 
     * @param {String} variable,变量. e.g. huobi.eth#btc.account.total
     * @param {Object} envOptions 
     *    realPrices: 市场币种价格。为空时，会自动获取当前市场的币种价格
     *    accounts: 账户信息。为空时会自动获取env.userName的账户信息。
     *              当变量是关于账户信息的，accounts、env两者不能全为空
     *    env,环境变量. e.g. { userName: "lcm" }
     * @returns {Object} .e.g.  12
     * @public 
     */
    * getVariableValue(variable,envOptions){
        /* 条件表达式中支持的变量
        huobi.eth#btc.buys
        huobi.eth#btc.sells

        huobi.eth#btc.buys[0] huobi.eth#btc.buys[0].amount huobi.eth#btc.buys[0].price
        huobi.eth#btc.sells[0] huobi.eth#btc.sells[0].amount huobi.eth#btc.sells[0].price

        huobi.eth#btc.account
        huobi.eth#btc.account.available
        huobi.eth#btc.account.total
        huobi.eth#btc.account.frozen
        huobi.eth#btc.account.loan 
        huobi.eth#btc.account.apply 

        //这里不能处理的变量
        huobi.eth#btc.buy  
        huobi.eth#btc.buy.amount
        huobi.eth#btc.buy.price

        huobi.btc#cny.sell
        huobi.eth#btc.sell.amount
        huobi.eth#btc.sell.price
        */

        if(!variable){
            return variable;
        }
        
        let str = variable.toString();
        variable = str.toLowerCase();
        let parts = variable.split('.');
        if(parts.length < 3){
            return variable;
        }


        let site = parts[0],
            symbolInfo = symbolUtil.getFullSymbol(parts[1],site),
            index = -1,
            variableType = parts[2], //参数类型
            addtional = [];

        var reg = /\.(buys|sells)\[(\d)+\](\.|$)/i; 
        var matches = variable.match(reg);
        if(matches && matches.length > 0){
            variableType = matches[1];
            index = parseInt(matches[2]);
        } 

        for(let i = 3; i < parts.length;i++){
            addtional.push(parts[i]);
        }

        let res = { fixed: false };
        let options = {
            variable: variable,
            site: site,
            symbol: symbolInfo.fullSymbol,
            variableType: variableType,
            index: index,
            addtional: addtional, //需要根据具体的情况才能确定的参数列表.如 ['total']
            realPrices: envOptions.realPrices,
            env: envOptions.env,
            account: envOptions.accounts
        };

        switch(variableType.toLowerCase()){
        //buy\sell这种变量不只是根据行情来判断，还应根据是否满足条件判断
        //case 'buy':
        //case 'sell':
        //    res = this._getPriceVarValue(variableType);
        //    break;
        case 'buys':
        case 'sells':
            options.side = (variableType == 'sells' ? 'sell' : 'buy'); 

            let getPriceVarRes = yield* this._getPriceVarValue(options);
            if(getPriceVarRes.fixed){
                res = getPriceVarRes.value;
            } else {
                res = variable;
            }
            break;
        case 'account':
            //options.env = env;
            let getAccountVarRes = yield* this._getAccountVarValue(options);
            if(getAccountVarRes.fixed){
                res = getAccountVarRes.value;
            } else {
                res = variable;
            }
            break;
        case 'fee':
            let getFeeVarRes = yield* this._getFeeVarValue(options);
            if(getFeeVarRes.fixed){
                res = getFeeVarRes.value;
            } else {
                res = variable;
            }
            break;
        case 'index':
            let getIndexPriceRes = yield* this._getFutruesIndex(options);
            if(getIndexPriceRes.fixed){
                res = getIndexPriceRes.value;
            } else {
                res = variable;
            }
            break;
        }

        return res;
    }


    /**
     * 获取能表达条件表达式的堆栈
     * 
     * @param {String} condition 条件表达式。如 (huobi.btc#cny.buy - okcoin.btc#cny.sell) / okcoin.btc#cny.buy > 0.1%
     *  一个条件表达式的组成分为三种 operator（运算符）、value（数值）、variable（变量）
     *  a、运算符。运算符包括条件运算符和算术运算符
     *  b、数值。比如1，0.01，1%等
     *  c、变量。huobi.btc#cny 表示交易平台火币网(huobi)中比特币(btc)兑换成人民币(cny)的市场价格
     * 
     * @returns {[string]} 表达条件表达式的堆栈 如['(','huobi.btc#cny.buy',')','>','1%']
     * @public
     */
    getConditionStacks(condition) {
        var item = '', index = 0, res, s;
        var stack = [];

        condition = condition.toString();                                                                                                                                                      
        while (index < condition.length) { //for(var i in condition){
            s = condition[index];
            // if (s == ' ') { //忽略掉空格
            //     index++;
            //     continue;
            // }
            var spaces = '';
            if (s == ' ') { //忽略掉空格
                if(item){
                    stack.push(item);
                    item = '';
                }

                while(s == ' '){
                    spaces += ' ';
                    index++;
                    s = condition[index];
                }
                stack.push(spaces);
                //continue;
            }

            //括号“(”有两层意思，一是运算符，一是函数表达式的组成部分
            //前面有不是操作符号的括号“（”，则认为是函数函数表达式的组成部分
            if (s == '(' && (item && !this.isOperate(item))) { //是函数
                var methodArgs = this._getMethodArgs(condition, index);
                index += methodArgs.length;

                var methodName = item;
                stack.push(methodName + methodArgs.replace(' ', ''));

                item = '';
            } else {

                res = this._isOperateStart(condition, index);
                if (res.isOperate) {
                    if (item) {
                        stack.push(item);
                    }
                    item = condition.substring(index, index + res.length);
                    stack.push(item);

                    index += res.length;
                    item = '';
                } else {
                    item += s;
                    if (index == condition.length - 1 && item.trim()) {
                        stack.push(item);
                    }

                    index++;
                }
            }
        }

        return stack;
    }

    isOperate(s) {
        return operators.indexOf(s) != -1;
    }

    * _getPriceVarValue(options){
        //计算如下类型的变量
        //huobi.eth#btc.buys
        //huobi.eth#btc.sells
        //huobi.eth#btc.buys[0] huobi.eth#btc.buys[0].amount huobi.eth#btc.buys[0].price
        //huobi.eth#btc.sells[0] huobi.eth#btc.sells[0].amount huobi.eth#btc.sells[0].price

        let res = { fixed: false, message: "不匹配的变量名称" };

        let getPriceRes;
        if(options.realPrices){
            options.realPrices.find(function(item){
                return item.site == options.site && item.symbol == options.symbol;
            });
        } 
        if(!getPriceRes){
            getPriceRes = yield* realTimePrice.getRealPrice(options.site,options.symbol);
        }

        if(!getPriceRes){
            res.message = '获取即时价格失败';
            return res;
        }

        let buys = getPriceRes.buys,
            sells = getPriceRes.sells,
            variableType = options.variableType;

        let getFieldValue = function(item,fieldName){
            let getFieldValRes = { fixed: false };
            switch(fieldName.toLowerCase()){
            case 'amount':
                getFieldValRes.fixed = true;
                getFieldValRes.value = item[1];
                break
            case 'price':
                getFieldValRes.fixed = true;
                getFieldValRes.value = item[0];
                break;
            default: 
                getFieldValRes.message = "不匹配的变量名称";
                break;
            }

            return  getFieldValRes;
        }
          
        if(variableType == 'buys'){
            if(options.index == -1){
                res.fixed = true;
                res.value = buys;
            } else if(options.index > -1 && options.index < buys.length){
                if(options.addtional.length == 0){
                    res.fixed = true;
                    res.value = buys[options.index];
                } else {
                    let fieldName = options.addtional[0];
                    res = getFieldValue(buys[options.index],fieldName);
                }
            }
        } else { //sells
            if(options.index == -1){
                res.fixed = true;
                res.value = sells;
            } else if(options.index > -1 && options.index < sells.length){
                if(options.addtional.length == 0){
                    res.fixed = true;
                    res.value = sells[options.index];
                } else {
                    let fieldName = options.addtional[0];
                    res = getFieldValue(sells[options.index],fieldName);
                }
            }        
        }

        return res;
    }

    * _getAccountVarValue(options){
        //计算如下类型的变量
        //huobi.eth#btc.account
        //huobi.eth#btc.account.total
        //huobi.eth#btc.account.frozen
        //huobi.eth#btc.account.loan 
        //huobi.eth#btc.account.apply 

        let res = { fixed: false, message: "不匹配的变量名称" };
        let accounts = options.accounts;
        if(!accounts){
            res.message = '没有提供的参数:accounts';
            return res;  
        }

        let fieldName = 'available';
        if(options.addtional.length > 0){
            fieldName = options.addtional[0];
        }
        if(['total','frozen','available','loan','apply'].indexOf(fieldName.toLowerCase()) == -1){
            res.message = '参数不匹配';
            return res;
        } 

        let userAccount;
        if(options.accounts){
            userAccount= options.accounts.find(function(item){
                return item.site == options.site;
            });
        }

        if(!userAccount){
            userAccount = yield account.getSiteAccount(options.env.userName,options.site,false);
        }

        if(!userAccount){
            res.fixed = true;
            res.value = 0;
            return res;        
        }

        //let symbols = userAccount.coins;
        let symbolItem = userAccount.coins.find(function(value){
            return value.coin == options.symbol;
        });
        if(!symbolItem){
            res.message = `获取帐户的币种信息失败,币种为:${options.symbol}`;
            return res;        
        }

        switch(fieldName.toLowerCase()){
        case 'total':
            res.value = symbolItem.total; 
            res.fixed = true;
            break;
        case 'frozen':
            res.value = symbolItem.frozen;
            res.fixed = true;
            break;
        case 'available':
            res.value = new Decimal(symbolItem.total).minus(symbolItem.frozen).toNumber();
            res.fixed = true;
            break;
        case 'loan':
            res.value = symbolItem.loan;
            res.fixed = true;
            break;
        case 'apply':
            res.value = symbolItem.apply;
            res.fixed = true;
            break;
        default:
            res.message = `获取帐户信息失败,非法的变量:${fieldName}`;
            res.fixed = false;
            break;
        }

        return res;    
    }

    * _getFeeVarValue(options){
        //计算如下类型的变量
        //bitvc.btc.fee
        //bitvc.btc.fee.pay
        //bitvc.btc_week.fee.maker_buy
        let res = { fixed: false, message: "不匹配的变量名称" };

        let express;
        if(options.addtional.length > 0){
            express = options.addtional[0];
        }
        express = express || 'pay';

        if(express == 'pay'){
            let coin = symbolUtil.getSymbolParts(options.symbol).targetCoin;
            res.value = yield* feeUtil.getPayFee(options.site,coin);
            res.fixed = true;
            res.message = '';
        } else if(express == 'settlement'){
            res.value = yield* feeUtil.getSettlementFee(options.site,options.symbol);
            res.fixed = true;
            res.message = '';
        } else {
            res.value = yield* feeUtil.getTradeFee(express,options.site,options.symbol);
            res.fixed = true;
            res.message = '';
        }

        return res;   
    }

    * _getFutruesIndex(options){
        //计算如下类型的变量
        //bitvc.btc.index
        let res = { fixed: false, message: "不匹配的变量名称" };
        // site: site,
        // symbol: symbolInfo.fullSymbol,
        let index = futureIndex.getFutureIndex(options.site,options.symbol);
        res.value = index;
        res.fixed = true;
        res.message = '';

        return res;   
    }

    _isOperateStart(condition, startIndex) {
        //NOTICE: 只支持1个和两个字符的运算符
        var s = condition[startIndex];
        var next = (startIndex == condition.length - 1) ? '' : condition[startIndex + 1];

        var res = { isOperate: false };
        if (this.isOperate(s + next)) {
            res = { isOperate: true, length: 2 };
        } else if (this.isOperate(s)) {
            res = { isOperate: true, length: 1 };
        }

        return res;
    }

    _getMethodArgs(condition, startIndex) {
        var stack = [], isFirst = true,
            args,
            index = startIndex;

        while (index < condition.length) {
            var char = condition[index];
            if (char == '(' && !isFirst) {
                stack.push(char);
            } else if (char == ')') {
                if (stack.length == 0) { //函数结束
                    args = condition.substring(startIndex, index + 1);
                    break;
                } else {
                    stack.pop();
                }
            }

            isFirst = false;
            index++;
        }

        return args;
    } 


    /**
     * 获取条件表达式组成项的类型
     * 
     * @param {String} expression,条件表达式组成项，如'('这是一个运算符，'1%'是一个数值，而'huobi.btc#cny.buy'是一个变量
     * @returns {String} 条件表达式的组成项类型,分为四种 operator（运算符）、value（数值）、variable（变量）、method(方法)
     * @public
     */
    getExpressionItemType(expressionItem){
        var expressionType;

        if(this.isOperatorType(expressionItem)){
            expressionType = 'operator';
        } else if(this.isValueType(expressionItem)){
            expressionType = 'value';
        } else if(this.isMethod(expressionItem)){
            expressionType ='method';
        } else{
            expressionType = 'variable';
        }

        return expressionType;
    }

    isMethod(expression){
        return MethodsRunner.isMethod(expression);
    }

    /**
     * 判断条件表达式的组成项是否为value（数值）
     * 
     * @param {String} expression,条件表达式组成项，如'('这是一个运算符，'1%'是一个数字，而'huobi.btc#cny.buy'是一个变量
     * @returns {Boolean} 如果条件表达式组成项是数值则返回true，否则返回false
     */
    isValueType(expression){
        var obj = expression.replace('%','');
        return !isNaN( parseFloat(obj) ) && isFinite( obj );
    }

    /**
     * 判断条件表达式的组成项是否为operator（运算符）
     * 
     * @param {String} expression,条件表达式组成项，如'('这是一个运算符，'1%'是一个数字，而'huobi.btc#cny.buy'是一个变量
     * @returns {Boolean} 如果条件表达式组成项是operator（运算符）则返回true，否则返回false
     */
    isOperatorType(expression){
        return operators.indexOf(expression) != -1;
    }

    /**
     * //todo 有点问题，但是暂时未使用，先搁置
     * 获取计算条件表达式需要提供哪些网站的哪些货币的行情
     * 
     * @param {String} condition 条件表达式。如 (huobi.btc#cny.buy - okcoin.btc#cny.sell) / okcoin.btc#cny.buy > 0.1%
     * @returns  [{ site: "huobi", symbol:"btc#cny" }]
     * @private
     */
    getConditionSymbols(condition){
        var stack = condition,
            siteSymbols = [];

        var getSiteItem = function(site,symbol){
            for(var i = 0; i < siteSymbols.length; i++){
                if(siteSymbols[i].site == site && siteSymbols[i].symbol == symbol){
                    return siteSymbols[i];
                }
            }
        }
        
        if(typeof condition == 'string'){
            stack = this.getConditionStacks(condition);
        }

        for(var stackItem of stack){
            var expressionType = this.getExpressionItemType(stackItem);
            if(expressionType == 'variable'){
                var isFixed = false,
                    arrItems = stackItem.split('.');
                if(arrItems.length != 2 && arrItems.length != 3){
                    continue;
                }

                /**
                 * 暂时只支持这种形式：huobi.btc#cny、huobi.btc#cny.buy 或 huobi.btc#cny.sell 
                 */
                var symbol = arrItems[1],
                    site = arrItems[0];
                if(arrItems.length == 3){
                    // huobi.btc#cny.buy
                    if(['BUY','SELL'].indexOf(arrItems[2].toUpperCase()) != -1){
                        isFixed = true;
                    }
                } else if (arrItems.length == 2){
                    //huobi.btc#cny
                    isFixed = true;
                } 
                
                if(isFixed && !getSiteItem(site,symbol)){
                    siteSymbols.push({ site: site, symbol: symbol });
                }
            } else if(expressionType == 'method'){
                //todo
                //calculate
            }
        }

        return siteSymbols;
    }

}();

module.exports = expression