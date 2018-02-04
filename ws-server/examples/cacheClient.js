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
    let symbolDepth = cacheClient.getSymbolDepth("bitfinex","btc#usd");
    console.log(JSON.stringify(symbolDepth));
})

setInterval(function(){
    let symbolDepth = cacheClient.getSymbolDepth("bitfinex","btc#usd");
    console.log(JSON.stringify(symbolDepth));
},15000)