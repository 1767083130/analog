'use strict';

const mongoose = require('mongoose');
const co = require('co');

const customConfig = require('../../../config/customConfig');
const database = require('../../../lib/database');
const configUtil = require('../../../lib/utils/configUtil');

/**
 * 运行方式： node test/lib/transferStrategys/strategyTester
 */


let dbConfig = customConfig.databaseConfig;
database.config(dbConfig);

let db = mongoose.connection;
db.once('open',function callback(){
    /**
     * 检验strategy生成的订单是否正确
     */
    setInterval(runNormalStrategry, 1000);
});

const transferController = require('../../../lib/transferStrategys/transferController');
function runNormalStrategry(){
    let userName = 'lcm'
    let env = { userName: userName };
    let envOptions = { env: env };
    let strategyType = 'normal';
    let condition = '(chbtc.etc#cny.buy / chbtc.btc#cny.sell - bitfinex.etc#btc.sell ) / bitfinex.etc#btc.sell * 100 > 0.3';

    co(function* () {
        let runRes = yield*  transferController.getConditionResult(condition,strategyType,envOptions);
        checkStrategryOrdersValid(condition,runRes);
    }).catch(function(err){
        console.error(err);
        //res.json({ isSuccess: false, code: 500, message: "500:服务器端发生错误"});
    });
}

function checkStrategryOrdersValid(expression,strategyOrders){
    let runExpression = function(express){
        var res;
        try{
            res = eval(express);
        } catch(e) {
            res = false;
            console.error(`判断表达式的值时发生错误。 ${express}`);
        }
        return res;
    }

    let newExpression = expression;
    for(let variableItem of strategyOrders.variableValues){
        newExpression = newExpression.replace(new RegExp(variableItem.stackItem,"gm"),variableItem.values[0][0]);
    }
    
    let res = runExpression(newExpression);
    if(res != strategyOrders.fixed){
        console.error('系统错误，1');
        return;
    }

    newExpression = expression;
    if(strategyOrders.fixed){
        let i = 0;
        for(let variableItem of strategyOrders.variableValues){
            newExpression = newExpression.replace(variableItem.stackItem,variableItem.values[strategyOrders.indexs[i][0]]);
        }
        res = runExpression(newExpression);
        if(res != strategyOrders.fixed){
            console.error('系统错误，2');
            return;
        }
    }

    console.error('系统正常');
}

var strategyRes = { 
    "fixed": true,
    "amounts": [
        17.614,
        0.172,
        29.3297
    ],
    "orders": [
        {
            "symbol": "etc#cny",
            "site": "chbtc",
            "side": "buy",
            "amount": 17.614,
            "price": 127.01
        },
        {
            "symbol": "btc#cny",
            "site": "chbtc",
            "side": "sell",
            "amount": 0.172,
            "price": 16726.3
        },
        {
            "symbol": "etc#btc",
            "site": "bitfinex",
            "side": "sell",
            "amount": 29.3297,
            "price": 0.0075744
        }
    ],
    "indexs": [
        0,
        2,
        1
    ],
    "variableValues": [
        {
            "stackItem": "chbtc.etc#cny.buy",
            "values": [
                [
                    127.01,
                    17.614
                ],
                [
                    127,
                    12.376
                ],
                [
                    126.79,
                    33
                ],
                [
                    126.78,
                    99.98
                ],
                [
                    126.77,
                    77
                ],
                [
                    126.75,
                    63.838
                ],
                [
                    126.7,
                    400
                ],
                [
                    126.58,
                    50
                ],
                [
                    126.57,
                    4.461
                ],
                [
                    126.5,
                    15.985
                ],
                [
                    126.28,
                    80
                ],
                [
                    126.27,
                    36.804
                ],
                [
                    126.23,
                    30
                ],
                [
                    126.03,
                    30
                ],
                [
                    126.02,
                    175.159
                ],
                [
                    126,
                    192.553
                ],
                [
                    125.76,
                    20
                ],
                [
                    125.72,
                    10.556
                ],
                [
                    125.69,
                    32.62
                ],
                [
                    125.55,
                    345.678
                ],
                [
                    125.5,
                    2
                ],
                [
                    125.46,
                    40.701
                ],
                [
                    125.37,
                    23.06
                ],
                [
                    125.33,
                    13.06
                ],
                [
                    125.24,
                    151.608
                ],
                [
                    125.01,
                    32.003
                ],
                [
                    125,
                    876.789
                ],
                [
                    124.92,
                    0.249
                ],
                [
                    124.8,
                    10
                ],
                [
                    124.72,
                    20
                ],
                [
                    124.71,
                    12.6
                ],
                [
                    124.6,
                    18.413
                ],
                [
                    124.59,
                    91.639
                ],
                [
                    124.5,
                    735.806
                ],
                [
                    124.2,
                    300
                ],
                [
                    124.15,
                    12.3
                ],
                [
                    124.08,
                    123.12
                ],
                [
                    124.02,
                    16.5
                ],
                [
                    124.01,
                    30.506
                ],
                [
                    124,
                    432.314
                ],
                [
                    123.96,
                    300
                ],
                [
                    123.9,
                    0.822
                ],
                [
                    123.89,
                    40.757
                ],
                [
                    123.88,
                    229.956
                ],
                [
                    123.86,
                    1516.08
                ],
                [
                    123.81,
                    0.041
                ],
                [
                    123.8,
                    57.692
                ],
                [
                    123.7,
                    15.6
                ],
                [
                    123.52,
                    30.894
                ],
                [
                    123.5,
                    163.506
                ]
            ],
            "site": "chbtc",
            "symbol": "etc#cny",
            "side": "buy"
        },
        {
            "stackItem": "chbtc.btc#cny.sell",
            "values": [
                [
                    16701.56,
                    0.009
                ],
                [
                    16726.25,
                    0.112
                ],
                [
                    16726.3,
                    0.051
                ],
                [
                    16772.06,
                    2.199
                ],
                [
                    16772.07,
                    0.9
                ],
                [
                    16772.15,
                    0.17
                ],
                [
                    16780,
                    0.655
                ],
                [
                    16797.96,
                    0.21
                ],
                [
                    16797.99,
                    2.451
                ],
                [
                    16798,
                    0.278
                ],
                [
                    16812.77,
                    0.002
                ],
                [
                    16897.35,
                    0.4
                ],
                [
                    16899.99,
                    3.33
                ],
                [
                    16900,
                    4.7
                ],
                [
                    16950,
                    0.382
                ],
                [
                    16998,
                    0.217
                ],
                [
                    17000,
                    0.483
                ],
                [
                    17008.35,
                    0.009
                ],
                [
                    17012.63,
                    0.054
                ],
                [
                    17012.73,
                    1.127
                ],
                [
                    17050,
                    0.368
                ],
                [
                    17082.51,
                    0.007
                ],
                [
                    17110.86,
                    0.4
                ],
                [
                    17110.89,
                    0.069
                ],
                [
                    17111,
                    0.3
                ],
                [
                    17113,
                    0.08
                ],
                [
                    17180,
                    1
                ],
                [
                    17198.8,
                    0.054
                ],
                [
                    17199,
                    5.708
                ],
                [
                    17200,
                    1.996
                ],
                [
                    17210,
                    0.024
                ],
                [
                    17239.66,
                    0.035
                ],
                [
                    17250,
                    0.05
                ],
                [
                    17298.99,
                    0.024
                ],
                [
                    17299.99,
                    0.05
                ],
                [
                    17300,
                    0.224
                ],
                [
                    17300.97,
                    1
                ],
                [
                    17312.21,
                    0.1
                ],
                [
                    17350,
                    1.36
                ],
                [
                    17400,
                    4.1
                ],
                [
                    17400.3,
                    0.643
                ],
                [
                    17450,
                    1.1
                ],
                [
                    17500,
                    12.997
                ],
                [
                    17550,
                    2
                ],
                [
                    17562.71,
                    5.745
                ],
                [
                    17573.97,
                    0.2
                ],
                [
                    17600,
                    1.751
                ],
                [
                    17650,
                    1.473
                ],
                [
                    17700,
                    1.616
                ],
                [
                    17700.23,
                    0.093
                ]
            ],
            "site": "chbtc",
            "symbol": "btc#cny",
            "side": "sell"
        },
        {
            "stackItem": "bitfinex.etc#btc.sell",
            "values": [
                [
                    0.0075743,
                    0.1
                ],
                [
                    0.0075744,
                    29.2297
                ],
                [
                    0.0075745,
                    21.36698437
                ],
                [
                    0.0075776,
                    58.4585
                ],
                [
                    0.0075777,
                    101
                ],
                [
                    0.0075795,
                    2.066731
                ],
                [
                    0.0075967,
                    0.15
                ],
                [
                    0.0076,
                    1
                ],
                [
                    0.0076001,
                    641.688
                ],
                [
                    0.0076002,
                    175.3782
                ],
                [
                    0.007601,
                    20
                ],
                [
                    0.00761,
                    1.75663641
                ],
                [
                    0.0076313,
                    10.62835014
                ],
                [
                    0.0076794,
                    4.9767371
                ],
                [
                    0.0076795,
                    58.4885
                ],
                [
                    0.0076796,
                    2419.19519995
                ],
                [
                    0.0076797,
                    800
                ],
                [
                    0.0076799,
                    2749.03189038
                ],
                [
                    0.00768,
                    30.58452
                ],
                [
                    0.0076898,
                    29.0993
                ],
                [
                    0.0076899,
                    8000
                ],
                [
                    0.00769,
                    18.6589299
                ],
                [
                    0.007699,
                    1202
                ],
                [
                    0.0077,
                    1617.60635185
                ]
            ],
            "site": "bitfinex",
            "symbol": "etc#btc",
            "side": "sell"
        }
    ]
}