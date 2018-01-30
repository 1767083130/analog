'use strict';

const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080/ws');

ws.on('open', function open() {
    console.log('连接server成功');

    //TODO 测试数据
    let addChannelReq = {
      'event':'addChannel',
      'channel':'market',
      'data': { symbol: '*' } 
    }
    ws.send(addChannelReq,err => {}); 

    let depthsData = {
      'event':'push',
      'channel':'market',
      'data': { 
        symbol: 'btc#usd',
        bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]],
        asks: [[19000,1.02],[19899,0.95],[19888.5,0.87]]
      } 
    };
    ws.send(depthsData,err => {}); 
});

ws.on('message', function incoming(data) {
    console.log(data);
});