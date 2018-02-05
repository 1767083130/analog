'use strict';

const WebSocket = require('ws');
const sitesMap = new Map(); //key: site, value: [{ symbol: "btc#usd",bids:[],asks:[],timestamp: 23432432 }]
const ChannelName = "wallet";

let market = new class {
    
    pushData(res){
        if(!res || !res.data){
            return;
        }

        let wallet = res.data;
        for(let walletItem of wallet){
            let site = walletItem.site;
            walletItem.timestamp = walletItem.timestamp ? +walletItem.timestamp : + new Date();

            let mapItem = sitesMap.get(site);
            if(!mapItem){
                sitesMap.set(site,[walletItem]);
            } else {
                let index = mapItem.findIndex(p => p.coin == walletItem.coin);
                if(index == -1){
                    mapItem.push(walletItem);
                } else {
                    if(mapItem[index].timestamp < walletItem.timestamp){
                        mapItem.splice(index,1,walletItem);
                    } 
                }
            }
        }
    }

    getWalletInfo(site){
        let mapItem = sitesMap.get(site);
        if(!mapItem){
            return { isSuccess: false, code: "10010", message: `网站${site}账户资产数据不存在`};
        }

        return { isSuccess: true, positions: mapItem };
    }

}();

module.exports = market;