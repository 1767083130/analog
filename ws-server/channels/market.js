'use strict';

const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const Market_ChannelName = "market";

let market = new class {
    
    addChannelItem(data,channel){
        //data数据格式:  { symbol: 'btc#usd' } 
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

    pushData(depth,clientsMap){
        //data数据格式: {
        //     site: "baidu",  //网站名称
        //     symbol: "btc#usd", //交易品种，如果为"*",则表示订阅如 "btc#usd"表示使用美元兑换比特币的交易品种
        //     bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]],   //array, 买单深度,已按照价格降序排列 数组索引(string) 0 价格, 1 量(张)
        //     asks: [[19100,1.03],[19105,0.98]]   //array,卖单深度,已按照价格升序排列 数组索引(string) 0 价格, 1 量(张)
        //     timestamp: res.realPrice.time //long, 服务器时间戳
        // }
        let site = data.site, 
            isNew = true;
        depth.timestamp = +depth.timestamp;

        let mapItem = sitesMap.get(site);
        if(!mapItem){
            sitesMap.set(site,[depth]);
        } else {
            let index = mapItem.findIndex(p => p.symbol == depth.symbol);
            if(index != -1){
                mapItem.push(depth);
            } else {
                if(+mapItem[index].timestamp < +depth.timestamp){
                    mapItem.splice(index,1,depth);
                } else {
                    isNew = false;
                }
            }
        }
        
        if(isNew){
            this._broadcastData(depth,clientsMap);
        }
    }

    _broadcastData(depth,clientsMap){
        for (let item of clientsMap.entries()) {
            let ws = item[0],
                channels = item[1],
                marketChannel = channels.find(p => p.channel == 'market');
             
            for(let symbolItem of marketChannel.items){
            }

            let channelData = [{
                "channel": Market_ChannelName,
                "success": true,
                //"errorcode":"",
                "data":depth
            }];
            ws.send(channelData);
        }
    }

}();

module.exports = market;