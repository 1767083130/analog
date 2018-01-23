'use strict';

const app = require('./index');
const http = require('http');
const curDomain = '192.168.0.101';
const port = process.env.PORT || 4000;

//socket model
const socServer = require('./lib/server/server');

//Expose
module.exports = app;

//Create and start HTTP server.
let server = http.createServer(app);


server.listen(port,curDomain);

//create socket service for get server instance
socServer.server(server);

server.on('listening', function () {
    console.log('Server listening on http://%s:%d', curDomain , this.address().port);
});

process.on('uncaughtException', function(e) {
    console.log(e);
});
