'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "position";

let position = new class {
    
    /**
     * 推送数据
     * @param {Object} res 
     */
    pushData(res){
        if(!res || !res.data){
            return;
        }

        let positions = res.data,
            site = res.site;
        for(let position of positions){
            position.timestamp = position.timestamp ? +position.timestamp : + new Date();

            let mapItem = sitesMap.get(site);
            if(!mapItem){
                sitesMap.set(site,[position]);
            } else {
                let index = mapItem.findIndex(p => p.symbol == position.symbol);
                if(index == -1){
                    mapItem.push(position);
                } else {
                    if(mapItem[index].timestamp < position.timestamp){
                        mapItem.splice(index,1,position);
                    } 
                }
            }
        }
    }

    /**
     * 获取最新的仓位信息
     * @param {String} site 网站名称 
     * @param {String} [symbol] 交易品种，如果为空，则获取全部项 
     */
    getPositions(site,symbol){
        let notFoundRes = { isSuccess: false, code: "10010", message: `网站${site}不存在交易品种${symbol ? symbol : '*'}的仓位信息`};
        let mapItem = sitesMap.get(site);
        if(!mapItem){
            return notFoundRes;
        }

        let positions = mapItem;
        if(symbol){
            let symbolPosition = mapItem.find(p => p.symbol == symbol);
            if(!symbolPosition){
                return notFoundRes; 
            } else {
                positions = symbolPosition;
            }
        } 

        return { isSuccess: true, data: positions };
    }
    
}();

module.exports = position;