'use strict';

const mongoose = require('mongoose');
const TransferStrategyLog = mongoose.model('TransferStrategyLog');

const BaseStrategyRunner = require('../../../lib/transferStrategys/baseStrategyRunner');
const NormalStrategyRunner = require('../../../lib/transferStrategys/normalStrategyRunner');
const Decimal = require('decimal.js');

const orderController = require('../../../lib/order');
const transferController = require('../../../lib/transferStrategys/transferController');
const testUtil = require('../../testUtil');
const co = require('co');
const assert = require('assert');

describe('差价策略基类测试. path: transferStrategys/transferController.js', function () {
    let baseStrategyRunner,normalStrategyRunner,
        oldEnv ,strategy, realPrices,accounts;
    let strategyLog;

    //有比较耗时间的测试，设置每个测试的过期时间为1分钟
    this.timeout(1 * 60 * 1000);
    
    before(function (done) {
        co(function *(){
            oldEnv = process.env.env;
            process.env.env = 'development';

            baseStrategyRunner = new BaseStrategyRunner();
            normalStrategyRunner = new NormalStrategyRunner();

            strategy = yield* testUtil.getTestTransferStrategy();
            realPrices = testUtil.getTestRealPrices();
            accounts = yield* testUtil.getTestAccount();

            done();
        }).catch(function(e){
            done(e);
        });
    });
    
    after(function(done){
        process.env.env =  oldEnv;
        done();
    });

    it('onOrderStatusChanged', function (done) {
        co(function *(){
            let stepAmount = 1;
            let identifier;
            let options = { 
                strategy: strategy,
                realPrices: realPrices,
                accounts: accounts,
                env: { userName: strategy.userName }
            };
             
            let strategyLog = yield* testUtil.getTestStrategyLog(options);
            let logOperate = strategyLog.operates[0];
            let res = yield* orderController.runOrderOperate(logOperate,identifier,stepAmount);
            let order = res.order;

            let e = {
                order: order, //变更后的订单
                changeAmount: stepAmount //变更的额度
            };

            yield* transferController.onOrderStatusChanged(e);

            //检验下一步操作是否生成正确
            strategyLog = yield TransferStrategyLog.load(strategyLog._id);
            assert.equal(strategyLog.operates[1].consignAmount == stepAmount,true);

            done();
        }).catch(function(e){
            done(e);
        });
    });

    it('onOrderDelayed', function (done) {
        co(function *(){
            let stepAmount = 1;
            let identifier;
            let options = { 
                strategy: strategy,
                realPrices: realPrices,
                accounts: accounts,
                env: { userName: strategy.userName }
            };

            let strategyLog = yield* testUtil.getTestStrategyLog(options);
            let logOperate = strategyLog.operates[0];
            let res = yield* orderController.runOrderOperate(logOperate,identifier,stepAmount);
            let order = res.order;

            let e = {
                order: order, //变更后的订单
                changeAmount: stepAmount, //变更的额度
                timeDelayed: 12 * 60 * 60 * 1000
            };
            yield* transferController.onOrderDelayed(e);

            done();
        }).catch(function(e){
            done(e);
        });
    });

    it.skip('onTransferStatusChanged', function (done) {
        co(function *(){
            //todo
            var e = {
                order: refreshOrder,
                changeAmount: 1
            };

            let res = yield* transferController.onTransferStatusChanged(e);
            done();
        }).catch(function(e){
            done(e);
        });
    });
});