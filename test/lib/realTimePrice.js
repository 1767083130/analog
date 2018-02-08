'use strict';

var //app = require('../../index.js'),
    request = require('supertest'),
    assert = require('assert'),
    co = require('co'),
    api = require('../../lib/apiclient/api'),
    realTimePrice = require('../../lib/realTimePrice');

describe('币种即时价格. path: realTimePrice.js', function () {

    //有比较耗时间的测试，设置每个测试的过期时间为1分钟
    this.timeout(1 * 60 * 1000);

    before(function (done) {
        done();
    });

    it('getSyncRealPrices 直接从网站同步获取多个网站多个币种的即时价格', function (done) {
        co(function *(){
            //现货 
            let realPrice = yield* realTimePrice.getSyncRealPrices(['btctrade'],['btc#cny']);
            assert.equal(realPrice.length == 1,true);

            //期货
            realPrice = yield* realTimePrice.getSyncRealPrices(['bitvc'],['btc#cny_7d']);
            assert.equal(realPrice.length == 1,true);

            done();
        }).catch(function(e){
            done(e);
        });
    });

    it('getRealPrice 获取即时价格', function (done) {
        co(function *(){
            //现货 
            let realPrice = yield* realTimePrice.getRealPrice('chbtc','btc#cny');
            assert.equal(realPrice.buys.length > 0,true);

            //期货
            realPrice = yield* realTimePrice.getRealPrice('bitvc','btc#cny_7d');
            assert.equal(realPrice.buys.length > 0,true);

            done();
        }).catch(function(e){
            done(e);
        });
    });



})