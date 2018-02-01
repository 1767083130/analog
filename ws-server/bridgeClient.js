'use strict';
const fs = require('fs');
const path = require('path');
const configUtil  = require('./configUtil');
const siteConfigs = require('bitcoin-clients').clients;
const SocketClient = require('./SocketClient');
const co = require('co');
const WebSocket = require('ws');

const Server_Url = 'ws://localhost:8080/ws'

let bridgeClient = new BridgeClient();
bridgeClient.start();

class BridgeClient {
    constructor(){
        this.clearLogs();
        this.ws = null;
    }

    start(){
        this.ws = new WebSocket(Server_Url);
        this.ws.on('open', function open() {
            console.log('连接server成功');
            this.connectSites();
        }.bind(this));
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

            if(['bitfinex','okex'].indexOf(platform.site) == -1 ){ //todo 'okex', 'bitfinex','bitmex',
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
            channels = ['order','position','market','wallet'];
        }

        //连接服务器并在成功后订阅消息通道
        let errListener;
        client.connect(function(e){
            console.log(`成功连接交易网站${this.site} ${this.type}.`);
            for(let channel of channels){
                let options = {
                    event: "addChannel",
                    channel: channel,
                    symbol: this.type == 'spot' ? '*' : "_",
                    params: []
                };
                client.send(options);
            }

            client.on('pong',function(){
                console.log(`${this.site} ${this.type} pong`);
            }.bind(this));
    
            //处理返回的数据
            client.on('message',function(res){
                co(function *(){
                    // if(res.type != 'market'){
                    //     this.log(this.site,res);
                    //     console.log(JSON.stringify(res));
                    // }
                    //console.log(JSON.stringify(res));
                        
                    switch(res.channel){
                    case 'order':
                        yield* this.orders_reached(res);
                        break;
                    case 'position':
                        yield* this.positions_reached(res);
                        break;
                    case 'market':
                        yield* this.market_reached(res);
                        break;
                    case 'wallet':
                        yield* this.wallet_reached(res);
                        break;
                    }
                }.bind(this)).catch(function(e){
                    throw e;
                });
    
            }.bind(this));
    
            //有可能是在重新连接的时候触发connect事件，这时先前注册的错误处理事件已经失效，需要重新注册
            client.off('error',errListener);
            client.on('error',this._onSocketError.bind(this));
        }.bind(this));
        
        //有可能在没有连接成功前触发错误，这时也需要进行错误处理
        client.on('error',errListener = this._onSocketError.bind(this));
    }

    _onSocketError(err){
        if(err.message || err.stack){
            console.error(`${this.site} ${this.type} 出错啦! ` + err.message + '\n' + err.stack);
         } else {
            console.error(`${this.site} ${this.type} 出错啦! ` +  JSON.stringify(err));
         }
    }

    * market_reached(e){
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
        
        ws.send({'event':'push','channel':'market','data': items} ,err => {}); 
    }

    * orders_reached(e){
        if(!e || !e.data){
            return;
        }

        ws.send({'event':'push','channel':'order','data': e.data} ,err => {}); 
    }

    * positions_reached(e){
        if(!e || !e.data){
            return;
        }

        ws.send({'event':'push', 'channel':'market','data': e.data} ,err => {}); 
    }

    * wallet_reached(e){
        if(!e || !e.data){
            return;
        }

        ws.send({'event':'push','channel':'wallet','data': e.data} ,err => {}); 
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





