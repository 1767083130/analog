'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "market";

let market = new class {
    
    addChannelItem(data,channel){
        //data数据格式:  {site: "okex",symbol: "btc#usd"} 
        //channel数据格式：{channel: "market", items:[ { site: "",symbols: []} ]}
        if(!data) throw new Error('参数data不能为空');
        if(!channel) throw new Error('参数channel不能为空');

        if(channel.items){
            let siteItem = channel.items.find(p => p.site == data.site);
            if(!siteItem){
                siteItem = { site: data.site, symbols: [] }
                channel.items.push(siteItem);
            }
            siteItem.symbols = siteItem.symbols || [];

            let symbolItem = siteItem.symbols.find(p => p == data.symbol || p == '*');
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
        //data数据格式: {
        //     site: "baidu",  //网站名称
        //     symbol: "btc#usd", //交易品种，如果为"*",则表示订阅如 "btc#usd"表示使用美元兑换比特币的交易品种
        //     bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]],   //array, 买单深度,已按照价格降序排列 数组索引(string) 0 价格, 1 量(张)
        //     asks: [[19100,1.03],[19105,0.98]]   //array,卖单深度,已按照价格升序排列 数组索引(string) 0 价格, 1 量(张)
        //     timestamp: res.realPrice.time //long, 服务器时间戳
        // }
        if(!res || !res.parameters || !res.parameters.data){
            return;
        }

        let depths = res.parameters.data,
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

    _broadcastData(depths,clientsMap){
        for (let item of clientsMap.entries()) {
            let ws = item[0],
                channels = item[1].channels;
            if(!channels){
                continue;
            }

            //client端是否订阅了通道
            let marketChannel = channels.find(p => p.channel == ChannelName);
            if(!marketChannel){
                continue;
            }

            let newDepths = [];
            for(let depth of depths){
                //判断客户端是否订阅了此类数据，如果已订阅，将数据加入数组
                let item = marketChannel.items.find(p => p.site == depth.site
                            && (p.symbols.indexOf(depth.symbol) != -1  || p.symbols.indexOf('*') != -1));
                if(item){
                    newDepths.push(depth);
                }
            }
            
            if(newDepths.length > 0){
                let channelData = {
                    "channel": ChannelName,
                    "success": true,
                    //"errorcode":"",
                    "data":newDepths
                };

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(channelData));
                } 
            }
        }
    }

}();

module.exports = market;