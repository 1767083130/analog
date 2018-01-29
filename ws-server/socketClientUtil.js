'use strict';
const fs = require('fs');
const path = require('path');
const configUtil  = require('./configUtil');
const siteConfigs = require('bitcoin-clients').clients;
const SocketClient = require('./SocketClient');
const co = require('co');

let socketClientUtil = new class  {
    constructor(){
        this.clearLogs();
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
                    let socketClient = new SocketClient(platform.site,'spot');
                    socketClient.connect(channels);
                }

                if(platform.clients.futuresClient && platform.clients.futuresClient.supported){
                    let socketClient = new SocketClient(platform.site,'futures');
                    socketClient.connect(channels);
                }               
            }
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

}();

module.exports = socketClientUtil;
