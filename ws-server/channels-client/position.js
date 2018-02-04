'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "position";

let position = new class {
    
    pushData(res){
        //data数据格式: {
        //     site: "baidu",  //网站名称
        //     symbol: "btc#usd", //交易品种，如果为"*",则表示订阅如 "btc#usd"表示使用美元兑换比特币的交易品种
        //     bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]],   //array, 买单深度,已按照价格降序排列 数组索引(string) 0 价格, 1 量(张)
        //     asks: [[19100,1.03],[19105,0.98]]   //array,卖单深度,已按照价格升序排列 数组索引(string) 0 价格, 1 量(张)
        //     timestamp: res.realPrice.time //long, 服务器时间戳
        // }
        if(!res || !res.parameters || !res.parameters.positions){
            return;
        }

        let positions = res.parameters.positions,
            newPositions = [];
        for(let position of positions){
            let site = depth.site;
            depth.timestamp = depth.timestamp ? +depth.timestamp : + new Date();

            let mapItem = sitesMap.get(site);
            if(!mapItem){
                sitesMap.set(site,[depth]);
            } else {
                let index = mapItem.findIndex(p => p.symbol == depth.symbol);
                if(index == -1){
                    mapItem.push(depth);
                    newPositions.push(depth);
                } else {
                    if(mapItem[index].timestamp < depth.timestamp){
                        mapItem.splice(index,1,depth);
                        newPositions.push(depth);
                    } 
                }
            }
        }
    }

    getPositions(){

    }
    
}();

module.exports = position;