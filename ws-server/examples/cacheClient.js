'use strict';
const CacheClient = require('../CacheClient');

let options = {
    sites: ["okex","bitfinex"],
    url: "ws://localhost:8080/ws"
}
let cacheClient = new CacheClient(options);
cacheClient.start();

let client = cacheClient.getClient();
client.on('open',function(){
    let symbolDepths = cacheClient.getSymbolDepths("bitfinex","btc#usd");
    console.log(JSON.stringify(symbolDepths));
})

setInterval(function(){
    let symbolDepth = cacheClient.getWalletInfo("bitfinex");
    console.log(JSON.stringify(symbolDepth));
},1500)

setInterval(function(){
    let symbolDepths = cacheClient.getSymbolDepths("bitfinex","btc#usd");
    console.log(JSON.stringify(symbolDepths));
},15000)

setInterval(function(){
    let positions = cacheClient.getPositions("bitfinex");
    console.log(JSON.stringify(positions));
},15000)