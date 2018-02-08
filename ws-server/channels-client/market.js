'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "market";

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

    /**
     * 获取即时价格
     * @param {String} site 网站名称
     * @param {String} [symbol] 交易品种,如果为空，则获取全部品种
     */
    getSymbolDepths(site,symbol){
        let mapItem = sitesMap.get(site);
        if(!mapItem){
            return { isSuccess: false, code: "10010", message: `网站${site}不存在交易品种${symbol ? symbol : '*'}的即时价格信息`};
        }

        let depths = symbol ? mapItem.find(p => p.symbol == symbol) : mapItem;
        if(!depths){
            return { isSuccess: false, code: "10010", message: `网站${site}不存在交易品种${symbol ? symbol : '*'}的即时价格信息`};
        }

        return { isSuccess: true, data: depths };
    }

}();

module.exports = market;