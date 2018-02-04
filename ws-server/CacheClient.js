'use strict';
var EventEmitter = require('eventemitter2').EventEmitter2;
var WebSocket = require('ws');
var md5 = require('MD5');
var util = require('util');
const clientChannel = require('./channels-client');
var debug = require('debug')('Client:realtime-api');

const SITE_NAME = 'pkell';

class CacheClient {
    constructor(options){
        this.client = null;
    }

    start(){  
        let client = new Client({
            appKey: 'a',
            appSecret: 'b',
            url: 'ws://localhost:8080/ws'
        });
        this.client = client;

        let channels = ['market','order','position','wallet']; 
        //连接服务器并在成功后订阅消息通道
        let errListener;
        client.connect(function(e){
            console.log(`成功连接交易网站pkell`);
            // setInterval(function(){
            //     client.send({now: + new Date()});
            // },50)

            for(let site of ['okex','bitfinex']){
                for(let channel of channels){
                    let options = {
                        event: "addChannel",
                        channel: channel,
                        parameters: { site: site, symbol: '*' }
                    };
                    client.send(options);
                }
            }

            client.on('pong',function(){
                console.log(`${site} ${type} pong`);
            }.bind(this));

            //处理返回的数据
            client.on('message', function(res){ 
                console.log(JSON.stringify(res));
                switch(res.channel){
                case 'order':
                    this.orders_reached(res);
                    break;
                case 'position':
                    this.positions_reached(res);
                    break;
                case 'market':
                    this.market_reached(res);
                    break;
                case 'wallet':
                    this.wallet_reached(res);
                    break;
                }
            }.bind(this));

            //有可能是在重新连接的时候触发connect事件，这时先前注册的错误处理事件已经失效，需要重新注册
            client.off('error',errListener);
            client.on('error', _onSocketError.bind(this));
        }.bind(this));

        //有可能在没有连接成功前触发错误，这时也需要进行错误处理
        client.on('error',errListener = _onSocketError.bind(this));
    }

    getClient(){
        return this.client;
    }

    getPositions(site){

    }

    getOrders(site){
        
    }

    getSymbolDepth(site,symbol){

    }

    getWalletInfo(site){

    }

}

module.exports = CacheClient