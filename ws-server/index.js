const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const server = http.createServer();

const wss = new WebSocket.Server({ 
    port: 8080 
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
    // Broadcast to everyone else.
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

// server.listen(8080, function listening() {
//     console.log('Listening on %d', server.address().port);
// });