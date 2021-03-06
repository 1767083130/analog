﻿'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Account  = mongoose.model('Account');
const ClientIdentifier  = mongoose.model('ClientIdentifier');
const Strategy = mongoose.model('Strategy');
const TransferStrategy = mongoose.model('TransferStrategy');

const co = require('co');
const async = co.wrap;
const only = require('only');
const accountLib = require('../../lib/account');
const transfer = require('../../lib/transfer');
const strategy = require('../../lib/strategy');
const configUtil = require('../../lib/utils/configUtil');
const transferController = require('../../lib/transferStrategys/transferController');

module.exports = function (router) {
    //router.get('/', account.index_api);

    router.get('/', async(function* (req, res) {
        try{
            list(req,res,function(data){
                // data = { transferStrategys: [{userName:"lcm"}]}
                // let json = {userName: JSON.stringify(data) };
                res.render('transferStrategy', data);
            });
        } catch(err){
            console.error(err);
            res.json({ isSuccess: false, code: 500, message: "500:服务器端发生错误"});
        }
    }));

    router.get('/list', async(function* (req, res) {
        try{
            list(req,res,function(data){
                res.json(data);   
            });
        } catch(err){
            console.error(err);
            res.json({ isSuccess: false, code: 500, message: "500:服务器端发生错误"});
        }
    }));


    router.get('/getConditionResult', async(function* (req, res) {
        try{
            let userName = req.user.userName;
            let env = { userName: userName };
            let envOptions = { env: env };
            let strategyType = req.body.strategyType || 'normal';
            let condition = req.body.condition || '1==0';

            let runRes = yield*  transferController.getConditionResult(condition,strategyType,envOptions);
            res.json({ isSuccess: true, conditionResult: runRes });
        } catch(err){
            console.error(err);
            res.json({ isSuccess: false, code: 500, message: "500:服务器端发生错误"});
        }
    }));


    router.post('/save', async(function* (req, res) {
        try{
            let userName = req.user.userName;
            let _transferStrategy = req.body.transferStrategy;
            
            let transferStrategy;
            if(_transferStrategy._id){
                let strategyId;
                if(_transferStrategy._id){
                    strategyId = mongoose.Types.ObjectId(_transferStrategy._id);
                }
                transferStrategy= yield TransferStrategy.findOne({_id: strategyId, userName: userName });
                if(!transferStrategy){
                    return res.json({ isSuccess: false,message: "修改的策略不存在，有可能已被删除" });
                }

                for(let key in _transferStrategy){
                    transferStrategy[key] = _transferStrategy[key];
                }
            } else {
                transferStrategy = new TransferStrategy(_transferStrategy);
            }

            transferStrategy.userName = req.user.userName;
            transferStrategy = yield transferStrategy.save();

            if(transferStrategy){
                res.json({ isSuccess: true,_id: transferStrategy._id.toString() });
            } else {
                res.json({ isSuccess: false, message: "操作失败，请稍后重试" });
            }
        } catch(err){
            console.error(err);
            res.json({ isSuccess: false, code: 500, message: "500:服务器端发生错误"});
        }
    }));


    router.post('/delete', async(function* (req, res) {
        try{
            let sStrategyId = req.body.id;
            let strategyId;
            if(sStrategyId){
                strategyId = mongoose.Types.ObjectId(sStrategyId);
            }
    
            let userName = req.user.userName;
            let transferStrategy = yield TransferStrategy.findOne({ userName: userName, _id: strategyId});
            if(!transferStrategy){
                return res.json({ isSuccess: false,message: "找不到需要删除的策略" });
            } 
        
            TransferStrategy.remove({userName: userName,_id: strategyId},function(err){
                if(err){
                    res.json({ isSuccess: false, message: "删除失败，请稍后重试"});
                } else {
                    res.json({ isSuccess: true, message: "删除成功！"});
                }
            });
        } catch(err){
            console.error(err);
            res.json({ isSuccess: false, code: 500, message: "500:服务器端发生错误"});
        }
    }));


    router.post('/run', async(function* (req, res) {
        try{
            let sStrategyId = req.body.strategyId;
            let strategyId;
            if(sStrategyId){
                strategyId = mongoose.Types.ObjectId(sStrategyId);
            }

            let transferStrategy = yield TransferStrategy.findOne({ userName: req.user.userName, _id: strategyId});
            if(!transferStrategy){
                return res.json({ isSuccess: false,message: "找不到运行的策略" });
            } 

            let runRes = yield* strategy.runTransferStrategy(transferStrategy);
            res.json({ isSuccess: runRes.isSuccess, message: runRes.message });
        } catch(err){
            console.error(err);
            res.json({ isSuccess: false, code: 500, message: "500:服务器端发生错误"});
        }
    }));
}


function list(req,res,callback){
    let sPageIndex = req.query.pageIndex;
    let sPageSize = req.query.pageSize;
    let pageIndex = Number(sPageIndex) || 0;
    let pageSize = Number(sPageSize) || 20;
    let userName = req.user.userName;

    let filters = { userName : userName};
    let run = req.query.run;
    if(run === undefined){
        run = true;
    }
    
    var options = {
        //select:   'title date author',
        sort: { modified : -1 },
        //populate: 'strategyId',
        lean: true,
        page: pageIndex + 1, 
        limit: pageSize
    };

    let business = configUtil.getBusiness();
    business.sites = configUtil.getSites();
    business.symbols = configUtil.getSymbols();

    TransferStrategy.paginate(filters, options).then(function(getRes) {
        let transferStrategys = getRes.docs;
        co(function* () {
            if(run){
                for(let transferStrategy of transferStrategys){
                    try{
                        let env = { userName: userName };
                        let envOptions = { env: env };
                        let strategyType = transferStrategy.strategyType || 'normal';
                        let condition = '1==1'
                        
                        for(let conditionItem of transferStrategy.conditions){
                            condition += ' && ' + conditionItem;
                        }

                        let runRes = yield*  transferController.getConditionResult(condition,strategyType,envOptions);
                        transferStrategy.conditionResult = runRes;
                    } catch(err){
                        //忽略错误
                        transferStrategy.conditionResult = { fixed: false };
                    }
                }
            }

            let t = {
                pageSize: getRes.limit,
                total: getRes.total,
                transferStrategys: JSON.stringify(transferStrategys),
                business: JSON.stringify(business),
                isSuccess: true
            };  

            callback(t);
        }).catch(function(err){
            //todo 记录错误日至
            let t = { isSuccess: false, message: "系统错误，请稍后重试" };
            callback(t);
        });
    });
}