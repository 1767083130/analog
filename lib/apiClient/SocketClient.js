'use strict';

const fs = require('fs');
const path = require('path');
const co = require('co');
const order = require('../order');
const realTimePrice = require('../realTimePrice');
const configUtil = require('../utils/configUtil');
const siteConfigs = require('bitcoin-clients').clients;

class SocketClient{
    /**
     * 构造函数
     * 
     * @param {String} site 网站名称
     * @param {String} type 类型。包括spot、futures两种
     */
    constructor(site,type){
        if(!site){
            throw new Error();
        }

        this.site = site;
        this.type = type;
        this.client = this._getClient(site,type);
    }

    /**
     * 连接套接字
     *
     * @channels {Array} 需要订阅的消息类型，默认为['order','wallet','position','market']
     */
    connect(channels){
        if(!this.client){
            console.error(`网站${this.site}不支持类型为${this.type}的socket`);
            return;
        }

        if(!channels){
            channels = ['order','position','market','wallet'];
        }

        //连接服务器并在成功后订阅消息通道
        let errListener;
        this.client.connect(function(e){
            console.log(`成功连接交易网站${this.site} ${this.type}.`);
            for(let channel of channels){
                let options = {
                    event: "addChannel",
                    channel: channel,
                    symbol: this.type == 'spot' ? '*' : "_",
                    params: []
                };
                this.client.send(options);
            }

            this.client.on('pong',function(){
                console.log(`${this.site} ${this.type} pong`);
            }.bind(this));
    
            //处理返回的数据
            this.client.on('message',function(res){
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
            this.client.off('error',errListener);
            this.client.on('error',this._onSocketError.bind(this));
        }.bind(this));
        
        //有可能在没有连接成功前触发错误，这时也需要进行错误处理
        this.client.on('error',errListener = this._onSocketError.bind(this));
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

        //console.log(JSON.stringify(e))
        for(let detail of e.data){
            // detail.site = detail.site.toLowerCase();
            // detail.symbol = detail.symbol.toLowerCase();
            realTimePrice.cacheRealPrice(detail);
            if(detail.site == 'okex'){
                
            }
        }
    }

    * orders_reached(e){
        try{
            //TODO
            //yield* order.syncOrder(e.order,e.outerOrder);
        }catch(err){
            console.error(err);
        }
    }

    * positions_reached(e){
        try{
            //yield* order.syncOrder(e.order,e.outerOrder);
        }catch(err){
            console.error(err);
        }
    }


    * wallet_reached(e){
        //todo
//        try{
//            yield* order.syncOrder(e.order,e.outerOrder);
//        }catch(err){
//            console.error(err);
//        }
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

}

module.exports = SocketClient