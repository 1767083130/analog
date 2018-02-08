'use strict';

const config  = require('../config/customConfig');
const symbolUtil = require('./utils/symbol');
//let SiteIdentifierQueue = []; //数据格式为{ site: "huobi",identifierIndex: 0 }

let configUtil = new class {

    getDefaultIdentifier(site){
        let platform = this._getPlatform(site);
        if(platform && platform.isValid && platform.identifiers){
            return platform.identifiers[0];
        }
    }

    getRestUrl(site){
        let platform = this._getPlatform(site);
        if(platform){
            return platform.restUrl;
        }
    }

    getFuturesRestUrl(site){
        let platform = this._getPlatform(site);
        if(platform){
            return platform.futuresRestUrl;
        }
    }

    getSites(){
        var sites = [];
        var platforms = config.platforms;
        for(let platform of platforms){
            platform.isValid && sites.push(platform.site);
        }

        return sites;
    }

    getDefaultSite(){
        return 'huobi';
    }

    getNaturalCoin(){
        return this.getBusiness().business.natural;
    }

    getSymbols(){
        var symbols = [];
        var platforms = config.platforms;

        for(let platform of platforms){
            for(let symbolItem of platform.symbols){
                if(symbols.indexOf(symbolItem.symbol) == -1){
                    symbols.push(symbolItem.symbol);
                }
            }
        }

        return symbols;   
    }

    getApiSymbol(site,symbol,reverse){
        let symbolItem = this.getSymbolItem(site,symbol,reverse);

        //symbolItem数据格式：{ symbol: "btc#cny_h17", alias: "XBCH17", tradeFee: { maker_buy: 0}}
        return reverse ? symbolItem.symbol : symbolItem.alias;
    }

    getSymbolItem(site,symbol,byAlias){
        let platform = this.getPlatform(site);
        if(!platform){
            return;
        }

        let symbolItem = platform.symbols.find(function(value){
             return byAlias ? (value.alias || '').toLowerCase() == symbol.toLowerCase()
                            : (value.symbol || '').toLowerCase() == symbol.toLowerCase()
        });

        return symbolItem;
    }

    isAutoTransfer(site){
        let platform = this._getPlatform(site);
        return platform && platform.autoTransfer;
    }
    
    getBusiness(){
        return config.business;
    }

    getPlatforms(){
        let platforms = [];
        for(let item of config.platforms){
            if(item.isValid){
                platforms.push(item);
            }
        }
        return platforms;
    }

    /**
     * 获取执行api的方法。总共有两种:socket,restful。默认为restful
     *
     * @param {String} site,交易平台
     * @param {String} fun,功能，包括order（交易）,market（市场），account(账户)三种
     * @param {Number} operate,操作类型，1，为获取查看 2，为执行，比如下单.默认为1 
     * @return {String} 返回执行api的方法
     */
    getMethodType(site,fun,operate){
        //配置文件中的数据格式为 "method": { "order": "1","market": "1" },
        let methodType = 'restful';
        let platform = this.getPlatform(site);
        if(!platform || !platform.socket){
            return methodType;
        }

        let t = 0;
        if(fun == 'order'){
            t = new Number(platform.socket.order || 0); 
        } else if(fun == 'market'){
            t = new Number(platform.socket.market || 0); 
        } else if(fun == 'account'){
            t = new Number(platform.socket.account || 0); 
        }

        if((t | 1 == 1 && operate == 1) 
           || (t | 2 == 1 && operate == 2)){
            methodType = 'socket';
        }

        return methodType;
    }

    checkSocketSupported(site){
        let platform = this.getPlatform(site);
        return platform && platform.socket
    }

    getPlatform(site){
        let platforms = this.getPlatforms();
        return platforms.find(function(value){
            return value.site == site;
        });
    }

    getNaturalCoin(){
        return config.business.natural;
    }

    getDatabaseConfig(){
        return config.databaseConfig;
    }

    getConfig(){
        return config;
    }

    /**
     * 获取计算时的等价币种，比如在策略中usdt等价于usd
     * @param {*} coin 币种
     */
    getEqualCoin(coin){
        let item = config.equalPairs.find(function(value){
            return value.coins.indexOf(pair) != -1;
        });

        return item.equalCoin || coin;
    }

    /**
     *  获取计算时的等价交易品种，比如在策略中btc#usdt_1q等价于btc#usd_1q
     * @param {*} symbol 
     */
    getEqualSymbol(symbol){
        let symbolParts = symbolUtil.getSymbolParts(symbol);
        symbolParts.settlementCoin = this.getEqualCoin(symbolParts.settlementCoin);
        symbolParts.targetCoin = this.getEqualCoin(symbolParts.targetCoin);

        let equalSymbol = symbolUtil.getSymbolByParts(symbolParts);
        return equalSymbol;
    }

    _getPlatform(site){
        let platform = config.platforms.find(function(value,index){
            return value.site == site;
        });

        return platform; 
    }

}();

module.exports = configUtil;