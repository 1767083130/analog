'use strict';

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const serverChannel = require('./channels-server');

/**
 * 服务端server
 */
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

    this.wss.on('connection', this._onConnection.bind(this));

    let noop = function() {}
    const interval = setInterval(function ping() {
      this.wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();
    
        ws.isAlive = false;
        ws.ping(noop);
      });
    }.bind(this), 10000);
  }

  _onConnection(ws,req){
    const ip = req.connection.remoteAddress;
    console.log('客户端连接成功：' + ip);

    ws.isAlive = true;
    ws.on('pong', function(){
      ws.isAlive = true;
    });

    ws.on('message', function(res){
      try {
          res = JSON.parse(res);
      } catch (e) {
          //this.emit('error', 'Unable to parse incoming data:', res);
          return;
      }
      
      try{
        switch(res.event){
        case 'addChannel':
          //{'event':'addChannel','channel':'channelValue','parameters':{'api_key':'value1','sign':'value2'}} 
          this.addChannelItem(res,ws);
          break;
        case 'removeChannel':
          //{'event':'removeChannel','channel':'channelValue' }
          this.removeChannel(res.channel,ws);
          break;
        case 'push':
          //{'event':'push','channel':'market','parameters':{ depths: [{ site:"qq", symbol: 'btc#usd',bids: [[19000,1.02],[19899,0.95],[19888.5,0.87]] }]} }
          this.pushData(res,this.clientsMap);
          break;
        }
      } catch (err){
        console.log(err);
      }


    }.bind(this));

    ws.on('error', err => console.log(`客户端 ${ip} errored: ${JSON.stringify(err)}`));
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

  addChannelItem(res,ws){
    //res数据格式： {'event':'addChannel','channel':'market','parameters': { symbol: 'btc#usd' } } 
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
      case 'wallet':
        serverChannel.wallet.addChannelItem(res.parameters,channel);
        break;
      case 'market':
        serverChannel.market.addChannelItem(res.parameters,channel);
        break;
      case 'order':
        serverChannel.order.addChannelItem(res.parameters,channel);
        break;
      case 'position':
        serverChannel.position.addChannelItem(res.parameters,channel);
        break;
    }
  }

  removeChannel(channelName,ws){
    let mapItem = this.getMapItem(ws);
    if(!mapItem || !mapItem.channels){
      return;
    }
      
    let index = mapItem.channels.findIndex(p => p.channel == channelName);
    if (index != -1) {
        mapItem.channels.splice(index, 1);
    }
  }

  pushData(res,ws){
    if(!res.channel){
      return;
    }

    switch(res.channel){
      case 'account':
        serverChannel.account.pushData(res,this.clientsMap);
        break;
      case 'market':
        serverChannel.market.pushData(res,this.clientsMap);
        break;
      case 'order':
        serverChannel.order.pushData(res,this.clientsMap);
        break;
      case 'position':
        serverChannel.position.pushData(res,this.clientsMap);
        break;
    }
  }

  getChannel(channelName,ws){
    let mapItem = this.getMapItem(ws,true);
    if(!mapItem || !mapItem.channels){
      return;
    }

    let channelItem = mapItem.channels.find(p => p.channel == channelName);
    return channelItem;
  }

  getMapItem(ws,autoNew){
    let mapItem = this.clientsMap.get(ws);
    if(!mapItem && autoNew){
        mapItem = this.clientsMap.set(ws,{});
    }

    return mapItem;
  }

}

let server = new Server();
server.start();
