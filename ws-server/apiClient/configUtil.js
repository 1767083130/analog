'use strict';

const config = require('bitcoin-clients').appConfig;
const clients = require('bitcoin-clients').clients; 

//let SiteIdentifierQueue = []; //数据格式为{ site: "huobi",identifierIndex: 0 }

let configUtil = new class {

    getDefaultIdentifier(site){
        let platform = this.getPlatform(site);
        return platform.identifiers[0];
    }

    getRestUrl(site){
        let platform = this.getPlatform(site);
        return platform.restUrl;
    }

    getClientsConfig(){
        return clients;
    }

    getSiteClientConfig(site){
        return clients[site];
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

    getTestApp(site){
        let apps = this.getTestApps(site);
        if(!apps || apps.length == 0){
            return;
        }

        return apps[0];
    }
    
    getTestApps(site){
        let platform = config.platforms.find(function(value,index){
            return value.site == site;
        });

        for(let identifier of platform.identifiers){
            //let identifier = platform.identifiers[0];
            identifier.site = site;
            identifier.userName = 'lcm';
        }

        return platform.identifiers;
    }

    /**
     * 获取系统牵涉到的所有法币
     */
    getPaperCurrencys(){
        return ['usd','usdt','cny','eur','jpy','qc','aed'];
    }

    /**
     * 获取执行api的方法。返回可选值：["restful","socket","none"]
     * 
     * @param {String} site,网站名称
     * @param {String} contractType, 可选值["futures","spot"]
     * @param {String} fun,功能，包括order（交易）,market（市场），account(账户)三种
     * @param {Number} operate,操作类型，1，为获取查看 2，为执行，比如下单.默认为1 
     * @returns {String} 返回执行api的方法,可选值：["restful","socket","none"]
     *      总共有两种:socket,restful。默认为none,表示不支持任何的访问方式
     */
    getAccessWay(site,contractType,fun,operate){
        let accessWay = 'none'; //default
        let platform = config.platforms.find(item => item.site == site);

        let checkSocketSupport = function(){
            if(!platform.socket){ //这里都默认为只读 
                platform.socket = { trade: 1, market: 1, account: 1 };
            }

            let t = 0;
            if(fun == 'order'){
                t = new Number(platform.socket.order || 0); 
            } else if(fun == 'market'){
                t = new Number(platform.socket.market || 0); 
            } else if(fun == 'account'){
                t = new Number(platform.socket.account || 0); 
            }
 
            return (t | 1 == 1 && operate == 1)  || (t | 2 == 1 && operate == 2)
        }

        let element = platform.clients;
        if(contractType == 'futures'){
            if(element.futuresClient && element.futuresClient.supported && checkSocketSupport()){
                accessWay = 'socket';
            } else { 
                if(element.futuresApi && element.futuresApi.supported){
                    accessWay = 'restful';
                }
            }
        } else {
            if(element.client && element.client.supported && checkSocketSupport()){
                accessWay = 'socket';
            } 
            else {
                if(element.api && element.api.supported){
                    accessWay = 'restful';
                }
            }
        }

        return accessWay ;
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

    _getPlatform(site){
        let platform = config.platforms.find(function(value,index){
            return value.site == site;
        });

        return platform; 
    }

}();

module.exports = configUtil;