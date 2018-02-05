'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "wallet";

let market = new class {
    
    pushData(res){
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
    }

    getWalletInfo(site){
        let mapItem = sitesMap.get(site);
        if(!mapItem){
            return { isSuccess: false, code: "10010", message: "数据不存在"};
        }

        return { isSuccess: true, positions: mapItem };
    }

}();

module.exports = market;