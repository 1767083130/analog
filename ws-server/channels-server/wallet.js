'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ coin: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "wallet";

let market = new class {
    addChannelItem(data,channel){
        //data数据格式:  {site: "okex",coin: "btc#usd"} 
        //channel数据格式：{channel: "market", items:[ { site: "",coins: []} ]}
        if(!channel) throw new Error('参数channel不能为空');
    
        if(channel.items){
            let siteItem = channel.items.find(p => p.site == data.site);
            if(!siteItem){
                siteItem = { site: data.site }
                channel.items.push(siteItem);
            }
        } else {
            channel.items = [];
            channel.items.push({
                site: data.site
            });
        }
    }

    pushData(res,clientsMap){
        if(!res || !res.parameters || !res.parameters.data){
            return;
        }

        let wallet = res.parameters.data,
            site = res.parameters.site,
            upgradeSites = new Set();
        for(let walletItem of wallet){
            walletItem.timestamp = walletItem.timestamp ? +walletItem.timestamp : + new Date();

            let mapItem = sitesMap.get(site);
            if(!mapItem){
                mapItem = [walletItem];
                sitesMap.set(site,mapItem);
                upgradeSites.add(site);
            } else {
                let index = mapItem.findIndex(p => p.coin == walletItem.coin && p.type == walletItem.type);
                if(index == -1){
                    mapItem.push(walletItem);
                    upgradeSites.add(site);
                } else {
                    if(mapItem[index].timestamp < walletItem.timestamp){
                        mapItem.splice(index,1,walletItem);
                        upgradeSites.add(site);
                    } 
                }
            }
        }
        
        for (let site of upgradeSites.keys()) {
            let wallet = sitesMap.get(site);
            this._broadcastData(site,wallet,clientsMap);
        }
    }

    _broadcastData(site,wallet,clientsMap){
        for (let item of clientsMap.entries()) {
            let ws = item[0],
                channels = item[1].channels;
            if(!channels){
                continue;
            }

            let walletChannel = channels.find(p => p.channel == ChannelName);
            if(!walletChannel){
                continue;
            }
            
            let channelData = {
                "channel": ChannelName,
                "success": true,
                "site": site,
                //"errorcode":"",
                "data": wallet
            };

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(channelData));
            } 
        }
    }

}();

module.exports = market;