'use strict';

const trialMarket = require('../../../lib/transferStrategys/trialMarket');
const co = require('co');
const assert = require('assert');
const Decimal = require('decimal.js');
const mongoose = require('mongoose');

describe.only('支付测试. path: transferStrategys/trialMarket.js', function () {

    //有比较耗时间的测试，设置每个测试的过期时间为1分钟
    //this.timeout(1 * 60 * 1000);

    before(function (done) {
        done();
    });
    
    after(function(done){
        done();
    })

    it.only('trialNoLimit ', function (done) {
        co(function *(){
            let realPrices,itemsRes;
            let siteA = 'baidu',siteB = 'qq';
            // realPrices = [
            //     { site: siteA, symbol: "eos#usd",buys: [[10.8,100]],sells: [[10.9,100]] },
            //     { site: siteA, symbol: "btc#usd",buys: [[11573,2]],sells: [[11574,2]] },
            //     { site: siteB, symbol: "eos#btc",buys: [[0.000931,20]],sells: [[0.00094,20]] }
            // ];
            // debugger
            // itemsRes = yield* trialMarket.trialPairNoLimit(siteA,siteB,realPrices);
            // assert.equal(itemsRes.length == 1 && itemsRes[0].period == 0.24, true);
            realPrices = [
                { site: siteA, symbol: "eos#usd",buys: [[10,100]],sells: [[11,100]] },
                { site: siteB, symbol: "eos#usd",buys: [[20,100]],sells: [[21,100]] },
            ];
            itemsRes = yield* trialMarket.trialPairNoLimit(siteA,siteB,realPrices);
            assert.equal(itemsRes[0].period == 45, true);

            let siteA_depth0 = { site: siteA, symbol: "eos#usd",buys: [[10,100]],sells: [[11,100]] }; 
            let siteA_depth1 = { site: siteA, symbol: "btc#usd",buys: [[10000,2]],sells: [[11000,2]] };
            let siteB_depth0 = { site: siteB, symbol: "eos#btc",buys: [[0.0009,20]],sells: [[0.001,20]] };
            realPrices = [
                siteA_depth0,
                siteA_depth1,
                siteB_depth0
            ];

            //siteA: eos -> usd -> btc     operate:sell -> buy
            //siteB: btc -> eos            operate:buy
            let priceA = new Decimal(1), priceB = new Decimal(1);
            priceA = priceA.times(siteA_depth0.buys[0][0]).div(siteA_depth1.sells[0][0]);
            priceB = priceB.times(siteB_depth0.sells[0][0]);
            
            let period,
                minus = new Decimal(priceA).minus(priceB);
            if(minus.greaterThan(0)){ //如果 priceA > priceB
                period = minus.div(priceA).times(100);
            } else {
                period = minus.div(priceB).times(100);
            }
            period = Math.abs(+period.toFixed(2));

            itemsRes = yield* trialMarket.trialPairNoLimit(siteA,siteB,realPrices,true);
            //assert.equal(itemsRes[0].period == 10, true);
            assert(itemsRes[0].period == period || itemsRes[1].period == period,true);
            done();
        });
    });

    it('trialLimit ', function (done) {
        co(function *(){
            let siteA = 'baidu',siteB = 'qq';
            let realPrices = [
                { site: siteA, symbol: "eos#usd",buys: [[10.8,100]],sells: [[10.9,100]] },
                { site: siteA, symbol: "btc#usd",buys: [[11573,2]],sells: [[11574,2]] },
                { site: siteB, symbol: "eos#btc",buys: [[0.000931,20]],sells: [[0.00094,20]] }
            ];
            let items = yield* trialMarket.trialPairLimit(siteA,siteB,realPrices);

            done();
        });
    });
});