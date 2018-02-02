'use strict';
const fs = require('fs');
const path = require('path');
const configUtil  = require('./configUtil');
const siteConfigs = require('bitcoin-clients').clients;
const co = require('co');
const WebSocket = require('ws');

const Server_Url = 'ws://localhost:8080/ws';

class BridgeClient {
    constructor(){
        //this.clearLogs();
        this.ws = null;
    }

    start(){
        this.ws = new WebSocket(Server_Url);
        this.ws.on('open', function open() {
            console.log('连接server成功');
            this.connectSites();
        }.bind(this));

        this.ws.on('close', _onWsClose.bind(this));
        this.ws.on('error',_onWsError.bind(this));
    }

    _onWsClose(){
        this.ws = null
        //this._isClosing = false // used to block reconnect on direct close() call
        this._isReconnecting = false
        this.emit('close')
        debug('ws connection closed')
    
        if (this._autoReconnect && !this._isClosing) {
          setTimeout(this.reconnect.bind(this), this._reconnectDelay)
        }
        this._isClosing = false
    }

    _onWsError(err){
        debug('error: %j', err)
        if(err.code){
            switch (err.code) {
                case 'ECONNREFUSED':
                case 'ENOENT':
                case 'ETIMEDOUT':
                case 'ENOTFOUND':
                    this._open = false;
                    this._ws = null;
                    if (this._autoReconnect && !this._isClosing && !this._isReconnecting) {
                        console.log('正在尝试重新与网站bitfinex进行连接...');
                        setTimeout(this.reconnect.bind(this), this._reconnectDelay)
                    }
                    break;
                default:
                    break;
            }
        }
    }

    connectSites(options){
        let channels = ['wallet','position','market'];   //todo  ['order','wallet','position','market']
        let platforms = configUtil.getPlatforms();
        for(let platform of platforms){
            if(options && options.sites && options.sites.indexOf(platform.site) == -1){
                continue;
            }
            if(!platform.isValid){
                continue;
            }

            if(['okex', 'bitfinex'].indexOf(platform.site) == -1 ){ //todo 'okex', 'bitfinex','bitmex',
                continue;
            }
            console.log(`正在连接交易网站${platform.site}...`);

            if(platform.clients){
                if(platform.clients.client && platform.clients.client.supported){
                    this.connectSite(platform.site,'spot',channels);
                }

                if(platform.clients.futuresClient && platform.clients.futuresClient.supported){
                    this.connectSite(platform.site,'futures',channels);
                }               
            }
        }
    }

    /**
     * 连接套接字
     *
     * @channels {Array} 需要订阅的消息类型，默认为['order','wallet','position','market']
     */
    connectSite(site,type, channels){
        let client = this._getClient(site,type);

        if(!client){
            console.error(`网站${site}不支持类型为${type}的socket`);
            return;
        }

        if(!channels){
            channels = ['market','order','position','wallet']; 
        }

        //连接服务器并在成功后订阅消息通道
        let errListener;
        client.connect(function(e){
            console.log(`成功连接交易网站${site} ${type}.`);
            for(let channel of channels){
                let options = {
                    event: "addChannel",
                    channel: channel,
                    symbol: type == 'spot' ? '*' : "_",
                    params: []
                };
                client.send(options);
            }

            client.on('pong',function(){
                console.log(`${site} ${type} pong`);
            }.bind(this));
    
            //处理返回的数据
            client.on('message', function(res){ 
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
            client.on('error',this._onSocketError.bind(this));
        }.bind(this));
        
        //有可能在没有连接成功前触发错误，这时也需要进行错误处理
        client.on('error',errListener = this._onSocketError.bind(this));
    }

    market_reached(e){
        if(!e || !e.data){
            return;
        }

        let items = [];
        for(let item of e.data){
            items.push({
                site: item.site,
                symbol: item.symbol,
                bids: item.buys,
                asks: item.sells,
                timestamp: +item.timestamp || +new Date()
            });
        }

        this.ws.send(JSON.stringify({'event':'push','channel':'market','data': items }),this._onSendDataError); 
    }

    orders_reached(e){
        if(!e || !e.data){
            return;
        }

        this.ws.send(JSON.stringify({'event':'push','channel':'order','data': e.data}),this._onSendDataError); 
    }

    positions_reached(e){
        if(!e || !e.data){
            return;
        }

        this.ws.send(JSON.stringify({'event':'push', 'channel':'market','data': e.data}),this._onSendDataError); 
    }

    wallet_reached(e){
        if(!e || !e.data){
            return;
        }

        this.ws.send(JSON.stringify({'event':'push','channel':'wallet','data': e.data}),this._onSendDataError); 
    }

    _onSocketError(err){
        if(err.message || err.stack){
            console.error(`${this.site} ${this.type} 出错啦! ` + err.message + '\n' + err.stack);
         } else {
            console.error(`${this.site} ${this.type} 出错啦! ` +  JSON.stringify(err));
         }
    }

    _onSendDataError(err){
        if(err){
            console.log('系统发生错误：' + JSON.stringify(err));
        }
    }

    /**
     * 获取client
     * 
     * @param {*} identifierOrSite 
     * @param {String} type 类型。包括spot、futures两种
     */
    _getClient(identifierOrSite,type){
        let identifier,site;
        let clientType =  (type == 'futures' ? 'futuresClient' : 'client');

        
        if(process.env.env == 'development'){
        //if(false){
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
                throw new Error('identifier不能为空');
            }
        }

        let options = {
            site: site,
            appKey: identifier && identifier.appKey,
            appSecret: identifier && identifier.appSecret,
            userName: identifier && identifier.userName
        };
        
        let Client = siteConfigs[site][clientType];
        if(Client){
            let client = new Client(options);
            return client;
        } else {
            throw new Error(`使用了没有实现的交易网站${site}的${clientType}客户端`);
        }
    }

    log(site,data){
        fs.appendFile(path.join(__dirname,'logs', site + '_log.txt'), JSON.stringify(data) + '\r\n\r\n', (err) =>  {
            if (err) throw err;
            //console.log("Export Account Success!");
        });
    }

    clearLogs(){
        let dir = path.join(__dirname,'logs');
        fs.readdirSync(dir).forEach(function(item){
            let stat = fs.lstatSync(path.join(dir, item));
            if(stat.isDirectory()){
                return;
            }
            fs.unlinkSync(path.join(dir, item));
        });
    }
}

let bridgeClient = new BridgeClient();
bridgeClient.start();





