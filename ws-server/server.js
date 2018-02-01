'use strict';

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const channelLib = require('./channels');

class Server {
  
  constructor(){
    this.clientsMap = new Map(); //key: ws, value: { channels: [{channel: "market", items:[ { site: "",symbols: []}] ] }
    this.wss = null;
  }

  start(){
    this.wss = new WebSocket.Server({ 
      port: 8080,
      path: '/ws'
    });

    this.wss.on('connection', this._onConnection);
  }

  _onConnection(ws){
    ws.on('message', function incoming(res) {
      console.log('收到信息：' + JSON.stringify(res));
      switch(data.event){
      case 'addChannel':
        //{'event':'addChannel','channel':'channelValue','data':{'api_key':'value1','sign':'value2'}} 
        this.addChannelItem(ws,res);
        break;
      case 'removeChannel':
        //{'event':'removeChannel','channel':'channelValue' }
        this.removeChannel(ws,res.channel);
        break;
      case 'push':
        //{'event':'push','channel':'market','data': { site:"qq", symbol: 'btc#usd',bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]] } }
        this.pushData(ws,res);
        break;
      }
    }.bind(this));
  }

  // Broadcast to all.
  broadcast(data) {
    // Broadcast to everyone else.
    this.wss.clients.forEach(function each(client) {
      //if (client !== ws && client.readyState === WebSocket.OPEN) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  addChannelItem(ws,res){
    //res数据格式： {'event':'addChannel','channel':'market','data': { symbol: 'btc#usd' } } 
    let mapItem = this.getMapItem(ws,true);
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

  removeChannel(ws,channelName){
    let mapItem = this.getMapItem(ws);
    if(!mapItem || !mapItem.channels){
      return;
    }
      
    let index = mapItem.channels.findIndex(p => p.channel == channelName);
    if (index != -1) {
        mapItem.channels.splice(index, 1);
    }
  }

  pushData(res){
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

  getMapItem(ws,autoNew){
    let mapItem = clientsMap.get(ws);
    if(!mapItem && autoNew){
        mapItem = clientsMap.set(ws,{});
    }

    return mapItem;
  }

}

let server = new Server();
server.start();

