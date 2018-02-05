'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "position";

let position = new class {
    
    pushData(res){
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

    getPositions(site,symbol){
        let mapItem = sitesMap.get(site);
        if(!mapItem){
            return { isSuccess: false, code: "10010", message: "数据不存在"};
        }

        let positions = mapItem.find(p => p.symbol == symbol);
        if(!positions){
            return { isSuccess: false, code: "10010", message: "数据不存在"};
        }

        return { isSuccess: true, positions: positions };
    }
    
}();

module.exports = position;