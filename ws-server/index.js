'use strict';

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const channelLib = require('./channels');

const clientsMap = new Map(); //key: ws, value: { channels: [{channel: "market", items:[ { site: "",symbols: []}] ] }
const wss = new WebSocket.Server({ 
  port: 8080,
  path: '/ws'
});

// Broadcast to all.
wss.broadcast = function broadcast(data) {
  // Broadcast to everyone else.
  wss.clients.forEach(function each(client) {
    //if (client !== ws && client.readyState === WebSocket.OPEN) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(res) {
    console.log('收到信息：' + JSON.stringify(res));
    switch(data.event){
    case 'addChannel':
      //{'event':'addChannel','channel':'channelValue','data':{'api_key':'value1','sign':'value2'}} 
      addChannelItem(ws,res);
      break;
    case 'removeChannel':
      //{'event':'removeChannel','channel':'channelValue' }
      removeChannel(ws,res.channel);
      break;
    case 'push':
      //{'event':'push','channel':'market','data': { site:"qq", symbol: 'btc#usd',bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]] } }
      pushData(ws,res);
      break;
    }
  });
});

function addChannelItem(ws,res){
  //res数据格式： {'event':'addChannel','channel':'market','data': { symbol: 'btc#usd' } } 
  let mapItem = getMapItem(ws,true);
  if(!mapItem.channels){
    mapItem.channels = [];
  }

  let channel = mapItem.channels.find(p => p.channel == res.channel);
  if(!channel){
    channel = { channel: res.channel,items: [] };
    mapItem.channels.push(channel);
  }

  switch(res.channel){
    case 'account':
      channelLib.account.addChannelItem(res.data,channel);
      break;
    case 'market':
      channelLib.market.addChannelItem(res.data,channel);
      break;
    case 'order':
      channelLib.order.addChannelItem(res.data,channel);
      break;
    case 'position':
      channelLib.position.addChannelItem(res.data,channel);
      break;
  }
}

function removeChannel(ws,channelName){
  let mapItem = getMapItem(ws);
  if(!mapItem || !mapItem.channels){
    return;
  }
    
  let index = mapItem.channels.findIndex(p => p.channel == channelName);
  if (index != -1) {
      mapItem.channels.splice(index, 1);
  }
}

function pushData(res){
  if(!res.channel){
    return;
  }

  switch(res.channel){
    case 'account':
      channelLib.account.pushData(res.data);
      break;
    case 'market':
      channelLib.market.pushData(res.data,clientsMap);
      break;
    case 'order':
      channelLib.order.pushData(res.data);
      break;
    case 'position':
      channelLib.position.pushData(res.data);
      break;
  }
}

function getMapItem(ws,autoNew){
  let mapItem = clientsMap.get(ws);
  if(!mapItem && autoNew){
      mapItem = clientsMap.set(ws,{});
  }

  return mapItem;
}

