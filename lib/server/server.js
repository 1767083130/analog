
/**
 * socket.io server for web browsing
 */


const socketSer = require('./../socket/index');
let io = '';



var server = function (server){
   io = socketSer(server);
};

var conection = function(){
    

    io.on('connection', function (socket) {
        var addedUser = false;
        
        //socket demo for test -- broadcast 
        socket.broadcast.emit('new message', {
        username: 'yyyyy',//事件驱动
        message: 'ddddad'
        });

        //
        socket.on('reqRealPrice',function(data){

            console.log(' data :'+data);

            //send realPrice to client
            socket.emit('a1',cache(null));
        });
    
    
    });
}


function cache(detil,cacheContr){
    console.log('进入到a1事件');
    let caches = require('./../cacheRealPrice');
    caches.realTimePrice.detaicacheRealPrice({ time: new Date(),site: "houbi",symbol:"btc#cny",buys:[[1234,1]],sells:'', buys:[[1235,12]]});
    console.log(caches);
    return caches;
}


exports.server = server;
exports.conection= conection;
