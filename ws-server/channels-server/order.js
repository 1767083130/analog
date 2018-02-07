'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "order";

let order = new class {
    
    addChannelItem(data,channel){
        //data数据格式:  {site: "okex",symbol: "btc#usd"} 
        //channel数据格式：{channel: "market", items:[ { site: "",symbols: []} ]}
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

        let orders = res.parameters.data,
            site = res.parameters.site;
        for(let order of orders){
            order.timestamp = order.timestamp ? +order.timestamp : + new Date();

            let mapItem = sitesMap.get(site);
            if(!mapItem){
                sitesMap.set(site,[order]);
            } else {
                if(mapItem.length > 20){
                    mapItem.splice(mapItem.length - 1,1,order);
                } else {
                    mapItem.push(order);
                }
            }
        }
        
        if(orders.length > 0){
            this._broadcastData(site,orders,clientsMap);
        }
    }

    _broadcastData(site,orders,clientsMap){
        for (let item of clientsMap.entries()) {
            let ws = item[0],
                channels = item[1].channels;
            if(!channels){
                continue;
            }

            let orderChannel = channels.find(p => p.channel == ChannelName);
            if(!orderChannel){
                continue;
            }

            let channelData = {
                site: site,
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

}();

module.exports = order;