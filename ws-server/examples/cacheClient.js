'use strict';
const CacheClient = require('../CacheClient');
const SITE = 'okex';
const SYMBOL = 'btc#usdt'
const Output = true;
const OnlyFailedMessage = true

let options = {
    sites: ["okex","bitfinex"],
    url: "ws://localhost:8080/ws"
}
let cacheClient = new CacheClient(options);
cacheClient.start();

let client = cacheClient.getClient();
client.on('open',function(){
    let symbolDepths = cacheClient.getSymbolDepths(SITE,"btc#usd");
    Output && log(symbolDepths)
})

client.on('message',function(res){
    if(res.channel && res.channel == 'order'){
        Output && console.log(JSON.stringify(res));
    }
})

setInterval(function(){
    let walletInfo = cacheClient.getWalletInfo(SITE);
    log(walletInfo);
},5000)

setInterval(function(){
    let symbolDepths = cacheClient.getSymbolDepths(SITE,SYMBOL);
    log(symbolDepths);
},7000)

setInterval(function(){
    let positions = cacheClient.getPositions(SITE);
    log(positions);
},4000)

function log(res){
    if(OnlyFailedMessage){
        !res.isSuccess && (Output && console.log(JSON.stringify(res)));
    } else {
        Output && console.log(JSON.stringify(res))
    }
}
