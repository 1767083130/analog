'use strict';

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const clientsMap = new Map(); //key: ws, value: { channels: [{site: "",symbols: []}] }
const wss = new WebSocket.Server({ 
  port: 8080,
  path: '/ws'
});

// Broadcast to all.
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    console.log('收到信息：' + JSON.stringify(data));
    switch(data.event){
    case 'addChannel':
      handleAddChannelRequest(ws,data);
      break;
    case 'removeChannel':
      handleRemoveChannelRequest(ws,data);
      break;
    case 'push':
      handlePushDataRequest(data);
      break;
    }
  });
});

function handleAddChannelRequest(ws,res){
  //data数据格式：{'event':'addChannel','channel':'market','data': { site: "huobi", symbol: 'btc#usd' } }
  let data = res.data,
     mapItem = clientsMap.get(ws);
  if(!mapItem){
    mapItem = clientsMap.set(ws,{});
  }

  if(mapItem.channels){
    let oldSiteItem = mapItem.channels.find(p => p.site == data.site || p.site == '*');
    if(!oldSiteItem){

    }
    let oldChannel = mapItem.channels.find(p => p.site == data.site && (p.symbol == data.symbol || p.symbol == '*'));
    if(!oldChannel){ //不存在
      mapItem.channels.push({
        site: data.site,
        symbols: [data.symbol]
      });
    }
  } else {
    let channels = [];
    channels.push({
      site: data.site,
      symbols: [data.symbol]
    });
    mapItem.channels = channels;
  }
}

function handleRemoveChannelRequest(ws,data){
  let mapItem = clientsMap.get(ws);

}

function handlePushDataRequest(data){
  // Broadcast to everyone else.
  wss.clients.forEach(function each(client) {
    //if (client !== ws && client.readyState === WebSocket.OPEN) {
    
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}