
/**
 * socket.io server for web browsing
 */



/**
 * #  Request  
        {'event':'addChannel','channel':'market','args':  {  symbol:  'btc#usd'  }  }

        #  Response
        {
                site:  "baidu",    //网站名称
                symbol:  "btc#usd",  //交易品种，如  "btc#usd"表示使用美元兑换比特币的交易品种
                bids:  [[19000,1.02],[19899,0.95],[19888.5,0.87]],      //array,  买单深度,已按照价格降序排列  数组索引(string)  0  价格,  1  量(张)
                asks:  [[19100,1.03],[19105,0.98]]      //array,卖单深度,已按照价格升序排列  数组索引(string)  0  价格,  1  量(张)
                timestamp:  res.realPrice.time  //long,  服务器时间戳
        }
 */

const socketSer = require('socket.io');
let users = new Map();       //每个socket.id对应的 实际登录的用户名

let usRoom = [];                //在使用的房间
let laterUsRoom = [];           //之后请求加入的房间
let emitRoom = [];
let pushInfo = [];              //发送到客户端的信息

const fs = require('fs');       //定时保存订阅用户信息
let io = null;


const ws = require('./wsServer').ws;
//ws.init('ws://192.168.0.101','7800');




var server = function (server) {
    io = socketSer(server);

    var marketIo = io.of('/market');

    marketIo.on('connection', function (socket) {

        //实现登录用户才能添加订阅
        socket.emit('connect_suc', { msg: socket.id });

        socket.on('login', function (data, fn) {

        });

        /*
        //请求服务器 电子货币 =>美元 实时价格
        io.emit('sendRealPrice',function ReqPrice(){
            
        });
        
        //接受服务器 电子货币 =>美元 实时价格
        io.on('getRealPrice',function ResPrice(){
            
        });
        
        
        //客户端发送 getRealPricesocket
        io.emit('sendRealPrice',{});
        */

        socket.on('reconnection', function () {

        });
        
        socket.on('event', function (data) {    //文章订阅请求 + 最新行情请求


            let { event, channel, args } = data;
            let { symbol, userId } = args;

            let socketId = socket.id;

            console.log(' args.symbol :' + symbol);
            console.log('####################### event data : ' + JSON.stringify(data));
            console.log('event :' + event + ' channel :' + channel + ' args :' + args);

            if (event !== 'addChannel' && event !== 'removeChannel' && event !== 'push') {
                console.error('》》》》》：订阅推送参数设置不正确！');
                return;
            }

            if (event === 'addChannel') {
                console.log('addChannel args.symbol : ' + symbol);


                if (!userId) {
                    userId = createUserId();
                }

                console.log('args.id : ' + userId);
                let roomName = symbol + "";

                (users.get(userId) !== socketId)
                    ? function () {
                        users.set(userId, socketId);
                        socket.join(symbol);
                    }
                    : function () {
                        console.log('没有添加数据');
                    }

                if (usRoom.indexOf(roomName) < 0) {                      //创建播放房间
                    usRoom.push(roomName);
                    ProductionData(marketIo, roomName);
                    console.log(' ### ###  频道:%s   启动', roomName);
                }

                return;
            }


            if (event === 'removeChannel') {
                return function () {
                    console.log('取消订阅');
                    marketIo.sockets[users.get(userId)].leave(symbol);      // btc#usc 房间 移除socket
                    socket.emit('removeData', { backInfo: 'remove服务端' });         //移除订阅内容
                }
            }

            socket.emit('pushData', { backInfo: 'push服务端' });         //实时推送信息

        });

    });
}



function createUserId() {
    let time = new Date();
    let timeStr = time.getFullYear + time.getMonth + time.getDay + time.getSeconds
    return 'dsg' + timeStr + Math.floor(Math.random() * 1000000);
}


function ProductionData(marketIo, symbol) {             //向后台服务接收数据，并将数据发送到 浏览器 前端 
    console.log('进入到ProductionData');
    let i = 0;

    var timer = setInterval(function () {

        //let data = ws.run(symbol);　     //向服务器请求内容dk
        //console.log(' ws服务器请求内容 : '+data);

        let curData = DataSer;
        let site = '';
        for (let index = 0; index < 5; index++) {
            site += CreateStr();

        }
        curData.site = site;
        curData.symbol = 'btc#usd';
        curData.bids = [[19000, 1.02], [19899, 0.95], [19888.5, 0.87]];      //array,  买单深度,已按照价格降序排列  数组索引(string)  0  价格,  1  量(张)
        curData.asks = [[19100, 1.03], [19105, 0.98]];      //array,卖单深度,已按照价格升序排列  数组索引(string)  0  价格,  1  量(张)
        curData.timestamp = new Date().toLocaleString();
        console.log(' curData :' + curData + '  运行次数：' + i++);
        //io.sockets.in(symbol).emit('pushData',curData);

        marketIo.in(symbol).emit('pushData', curData);
        // socket.emit('pushData',{backInfo:'push服务端'});         //实时推送信息
    }, 2000);
    return timer;
}

function AddData(socket) {

    socket.emit('addData', {});
}

function CreateStr() {
    var arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'A', 'V', 'H', 'E', 'Z', 'O'];
    let i = Math.floor(Math.random() * arr.length);
    return arr[i];
}


var DataSer = {
    site: '',    //网站名称
    symbol: '',  //交易品种，如  "btc#usd"表示使用美元兑换比特币的交易品种
    bids: [],      //array,  买单深度,已按照价格降序排列  数组索引(string)  0  价格,  1  量(张)
    asks: [],      //array,卖单深度,已按照价格升序排列  数组索引(string)  0  价格,  1  量(张)
    timestamp: '' //long,  服务器时间戳
}



/*
function VipRoom(io){

    const subscriptionRoom = io.of('/subscription');

    subscriptionRoom.emit();

}


function Subscription(){
            
}
*/

exports.server = server;
