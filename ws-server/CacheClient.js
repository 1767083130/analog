'use strict';
const EventEmitter = require('eventemitter2').EventEmitter2;
const WebSocket = require('ws');
const md5 = require('MD5');
const configUtil = require('./apiClient/configUtil');
const clientChannel = require('./channels-client');
const Client = require('./Client');
const debug = require('debug')('Client:realtime-api');

const SITE_NAME = 'pkell';
const Default_Channels = ['market','order','position','wallet']; 
const ReadyStates =  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
const AdviseDelay = 5 * 1000; //启动后建议停留时间，5s

class CacheClient {
    constructor(options){        
        this.options = options || {};
        let defaultOptions = this.getDefaultOptions();
        Object.assign(this.options,defaultOptions,this.options);

        this.client = null;
        this.readyTime = null;
    }

    getDefaultOptions(){
        let sites = [],
            platforms = configUtil.getPlatforms();
        platforms.forEach(p => sites.push(p.site));

        return {
            channels: Default_Channels,
            sites: sites,
            url: 'ws://localhost:8080/ws'
        };
    }

    /**
     * 获取client状态。可能的几种状态：'CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'
     */
    get readyState() {
        if(!this.client){
            throw new Error('socket client还没有启动，请先调用start方法进行启动');
        }

        return this.client.readyState;
    }

    start(callback){  
        let client = new Client({
            appKey:  this.options.appKey,
            appSecret: this.options.appSecret,
            url: this.options.url
        });
        this.client = client;

        //连接服务器并在成功后订阅消息通道
        let errListener;
        client.connect(function(e){
            for(let site of this.options.sites){
                for(let channel of this.options.channels){
                    let options = {
                        event: "addChannel",
                        channel: channel,
                        parameters: {
                            site: site, 
                            symbol: '*' 
                        }
                    };
                    client.send(options);
                }
            }

            //处理返回的数据
            client.on('message', function(res){ 
                //console.log(JSON.stringify(res));
                switch(res.channel){
                case 'position':
                    clientChannel.position.pushData(res);
                    break;
                case 'market':
                    clientChannel.market.pushData(res);
                    break;
                case 'wallet':
                    clientChannel.wallet.pushData(res);
                    break;
                // case 'order':
                //     clientChannel.order.pushData(res);
                //     break;
                }
            }.bind(this));

            //有可能是在重新连接的时候触发connect事件，这时先前注册的错误处理事件已经失效，需要重新注册
            client.off('error',errListener);
            client.on('error', this._onSocketError.bind(this));

            callback && callback(e);
            this.readyTime = new Date();
        }.bind(this));

        //有可能在没有连接成功前触发错误，这时也需要进行错误处理
        client.on('error',errListener = this._onSocketError.bind(this));
    }


    getClient(){
        return this.client;
    }

    getPositions(site,symbol){
        if(!this.client){
            return { isSuccess: false, code: "2000001", message: "系统尚未启动"}
        }
        if(+new Date - (+this.readyTime) < AdviseDelay){
            console.warn(`有可能没有获取到完整的数据，建议${AdviseDelay}ms后再调用此方法`);
        } 

        return clientChannel.position.getPositions(site,symbol);
    }

    getRecentOrders(site,symbol){
        if(!this.client){
            return { isSuccess: false, code: "2000001", message: "系统尚未启动"}
        }
        if(+new Date - (+this.readyTime) < AdviseDelay){
            console.warn(`有可能没有获取到完整的数据，建议${AdviseDelay}ms后再调用此方法`);
        } 

        return clientChannel.order.getRecentOrders(site,symbol);
    }


    getSymbolDepths(site,symbol){
        if(!this.client){
            return { isSuccess: false, code: "2000001", message: "系统尚未启动"}
        }
        if(+new Date - (+this.readyTime) < AdviseDelay){
            console.warn(`有可能没有获取到完整的数据，建议${AdviseDelay}ms后再调用此方法`);
        } 

        return clientChannel.market.getSymbolDepths(site,symbol);
    }

    getWalletInfo(site){
        if(!this.client){
            return { isSuccess: false, code: "2000001", message: "系统尚未启动"}
        }
        if(+new Date - (+this.readyTime) < AdviseDelay){
            console.warn(`有可能没有获取到完整的数据，建议${AdviseDelay}ms后再调用此方法`);
        } 
        
        return clientChannel.wallet.getWalletInfo(site);
    }

    _onSocketError(err){
        if(err.message || err.stack){
            console.error(`${this.site} ${this.type} 出错啦! ` + err.message + '\n' + err.stack);
        } else {
            console.error(`${this.site} ${this.type} 出错啦! ` +  JSON.stringify(err));
        }
    }
}

//readyStates有几种状态： ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
ReadyStates.forEach((readyState, i) => {
    CacheClient[ReadyStates[i]] = i;
});

module.exports = CacheClient