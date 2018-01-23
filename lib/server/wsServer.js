
const ws = require('ws');
//const logger = require();
const wss = function () {
    let initWs = '';

    wss.init = function init(address,port) {
        let ip = 'ws://' + address + ':' + port;
        console.log(' ip: '+ip);
        initWs = ws(ip);
        if (initWs !== null && initWs !== undefined) {
            initWs = ws('ws://127.0.0.1');
        }
    }

    wss.onopen = function (data) {
        (typeof data == 'string') && function () {
            console.log(data);
            initWs.send(data);//向后台发送数据
        }
    };

    wss.onclose = function (e) {//当链接关闭的时候触发

    };

    wss.onmessage = function (e) {//后台返回消息的时候触发
        let timer = setTimeout(() => {

        }, timeout);
    };

    wss.onerror = function (e) {//错误情况触发

    }
}

const WsServ = function WebSocketServ(){
    const wsRun = new wss();
    
    WsServ.init = function init(adress,port){
        wsRun.init(adress,port);
    }

    WsServ.run = function (args){
        wsRun.onopen(args);
        wsRun.onmessage();
        return data;
    }
}

exports.ws = new WsServ();