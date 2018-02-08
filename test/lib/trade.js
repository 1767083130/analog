'use strict';

const query = require('querystring');
const request = require('supertest');
const orderController = require('../../lib/order');
const testUtil = require('../testUtil');

const BaseStrategyRunner = require('../../lib/transferStrategys/baseStrategyRunner');
const NormalStrategyRunner = require('../../lib/transferStrategys/normalStrategyRunner');
const Decimal = require('decimal.js');

const assert = require('assert');
const co = require('co');

describe('支付测试. path: order.js', function () {
    let account,
        oldEnv ,strategy, realPrices;
    let strategyLog;

    //有比较耗时间的测试，设置每个测试的过期时间为1分钟
    this.timeout(1 * 60 * 1000);

    before(function (done) {
        co(function *(){
            oldEnv = process.env.env;
            process.env.env = 'development';
     
            strategy = yield* testUtil.getTestTransferStrategy();
            realPrices = testUtil.getTestRealPrices();
            account = yield* testUtil.getTestAccount(true);

            //构建测试数据TransferStrategyLog
            let options = { 
                strategy: strategy,
                realPrices: realPrices,
                accounts: account,
                env: { userName: strategy.userName }
            };
            strategyLog = yield* testUtil.getTestStrategyLog(options);

            done();
        }).catch(function(e){
            done(e);
        });
    });
    
    after(function(done){
        process.env.env = oldEnv;
        done();
    })

    it('runOrderOperate 执行需要委托交易的差价策略的step', function (done) {
        co(function *(){
            let logOperate = strategyLog.operates.find(function(value){
                return value.orgOperate.action == 'trade' && value.orgOperate.side == 'buy';
            });

            let stepAmount = 10;
            let identifier;
            let oldEthCoin = testUtil.getAccountCoin('eth',account);

            let res = yield* orderController.runOrderOperate(logOperate,identifier,stepAmount);
            account = yield* testUtil.getTestAccount();
            let newEthCoin = testUtil.getAccountCoin('eth',account);

            assert.equal(res.isSuccess,true);

            //账户币种总额不变，冻结数增加
            assert.equal(new Decimal(oldEthCoin.total).equals(newEthCoin.total),true); 
            assert.equal(new Decimal(oldEthCoin.apply).plus(stepAmount).equals(newEthCoin.apply),true); 

            done();
        }).catch(function(e){
            done(e);
        });
    });

    it('cancelOrder 撤销交易委托', function (done) {
        co(function *(){
            let logOperate = strategyLog.operates[0];
            let stepAmount = 10;
            let identifier;
            let oldEthCoin = testUtil.getAccountCoin('eth',account);

            let res = yield* orderController.runOrderOperate(logOperate,identifier,stepAmount);
            let newEthCoin = testUtil.getAccountCoin('eth',account);

            assert.equal(res.isSuccess,true);

            //账户币种总额不变，冻结数不变
            assert.equal(new Decimal(oldEthCoin.total).equals(newEthCoin.total),true); 
            assert.equal(new Decimal(oldEthCoin.frozen).equals(newEthCoin.frozen),true); 

            done();
        }).catch(function(e){
            done(e);
        });
    });

    

    it('retryOrder 撤销交易委托', function (done) {
        co(function *(){

            let identifier;
            let oldEthCoin = testUtil.getAccountCoin('eth',account);

            let options = { priceRange: 100 };
            let order = yield* testUtil.getTestOrder('buy',10,options)
            let res = yield* orderController.retryOrder(order,identifier,options);
            let newEthCoin = testUtil.getAccountCoin('eth',account);

            assert.equal(res.isSuccess,true);

            //账户币种总额不变，冻结数增加
            assert.equal(new Decimal(oldEthCoin.total).equals(newEthCoin.total),true); 
            //assert.equal(new Decimal(oldEthCoin.frozen).plus(stepAmount).equals(newEthCoin.frozen),true); 

            done();
        }).catch(function(e){
            done(e);
        });
    });

    it('syncUserRecentOrders 处理一个用户的所有委托.如果在一定时间内没有成交成功的委托，尝试重新提交新的委托',function(done){
        co(function *(){
            let userName = 'lcm';
            let sites = ['btctrade'];

            yield* orderController.syncUserRecentOrders(userName,sites,function(err,res){
                assert.equal(res.isSuccess,true);
                done();
            });
        }).catch(function(e){
            done(e);
        });
    });

    it('syncOrders 同步最近委托状态', function (done) {
        co(function *(){
            yield* orderController.syncOrders(function(err,res){
                assert.equal(res.isSuccess,true);
                done();
            });
        }).catch(function(e){
            done(e);
        });
    });

});
