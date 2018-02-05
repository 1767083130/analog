'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "order";

let order = new class {
    
    addChannelItem(data,channel){
        //data数据格式:  {site: "okex",symbol: "btc#usd"} 
        //channel数据格式：{channel: "market", items:[ { site: "",symbols: []} ]}
    
        if(channel.items){
            let siteItem = channel.items.find(p => p.site == data.site);
            if(!siteItem){
                siteItem = { site: data.site, symbols: [] }
                channel.items.push(siteItem);
            }

            let symbolItem = siteItem.symbols.find(p => p.symbol == data.symbol || p.symbol == '*');
            if(!symbolItem){ //不存在
                siteItem.symbols.push(data.symbol);
            }
        } else {
            channel.items = [];
            channel.items.push({
                site: data.site,
                symbols: [data.symbol]
            });
        }
    }

    pushData(res,clientsMap){
        if(!res || !res.data){
            return;
        }

        let depths = res.data,
            newDepths = [];
        for(let depth of depths){
            let site = depth.site;
            depth.timestamp = depth.timestamp ? +depth.timestamp : + new Date();

            let mapItem = sitesMap.get(site);
            if(!mapItem){
                sitesMap.set(site,[depth]);
            } else {
                let index = mapItem.findIndex(p => p.symbol == depth.symbol);
                if(index == -1){
                    mapItem.push(depth);
                    newDepths.push(depth);
                } else {
                    if(mapItem[index].timestamp < depth.timestamp){
                        mapItem.splice(index,1,depth);
                        newDepths.push(depth);
                    } 
                }
            }
        }
        
        if(newDepths.length > 0){
            this._broadcastData(newDepths,clientsMap);
        }
    }

    _broadcastData(orders,clientsMap){
        for (let item of clientsMap.entries()) {
            let ws = item[0],
                channels = item[1].channels;
            if(!channels){
                continue;
            }

            let marketChannel = channels.find(p => p.channel == ChannelName);
            if(!marketChannel){
                continue;
            }
            
            if(newDepths.length > 0){
                let channelData = {
                    "channel": ChannelName,
                    "success": true,
                    //"errorcode":"",
                    "data": orders
                };

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(channelData));
                } 
            }
        }
    }

}();

module.exports = order;