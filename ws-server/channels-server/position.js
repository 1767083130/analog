'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "position";

let position = new class {
    
    addChannelItem(data,channel){
        //data数据格式:  {site: "okex",symbol: "btc#usd"} 
        //channel数据格式：{channel: "market", items:[ { site: "",symbols: []} ]}
        if(!channel) throw new Error('参数channel不能为空');
    
        if(channel.items){
            let siteItem = channel.items.find(p => p.site == data.site);
            if(!siteItem){
                siteItem = { site: data.site, symbols: [] }
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

        let positions = res.parameters.data,
            newPositions = [];
        for(let position of positions){
            let site = position.site;
            position.timestamp = position.timestamp ? +position.timestamp : + new Date();

            let mapItem = sitesMap.get(site);
            if(!mapItem){
                sitesMap.set(site,[position]);
            } else {
                let index = mapItem.findIndex(p => p.symbol == position.symbol);
                if(index == -1){
                    mapItem.push(position);
                    newPositions.push(position);
                } else {
                    if(mapItem[index].timestamp < position.timestamp){
                        mapItem.splice(index,1,position);
                        newPositions.push(position);
                    } 
                }
            }
        }
        
        if(newPositions.length > 0){
            this._broadcastData(newPositions,clientsMap);
        }
    }

    _broadcastData(positions,clientsMap){
        for (let item of clientsMap.entries()) {
            let ws = item[0],
                channels = item[1].channels;
            if(!channels){
                continue;
            }

            //判断客户端是否订阅了channel，如果没有订阅，则忽略
            let positionChannel = channels.find(p => p.channel == ChannelName);
            if(!positionChannel){
                continue;
            }
 
            let channelData = {
                "channel": ChannelName,
                "success": true,
                //"errorcode":"",
                "data": positions
            };

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(channelData));
            } 
        }
    }

}();

module.exports = position;