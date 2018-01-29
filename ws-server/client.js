const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
    console.log('连接server成功');
    ws.send('something');
});

ws.on('message', function incoming(data) {
  console.log(data);
});