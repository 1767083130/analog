'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const only = require('only');
const Decimal = require('decimal.js');
const position = require('../../lib/position');

module.exports = function (router) {
  
    /**
     * 获取账户资产详情
     * http://localhost:4000/api/position/getPositions
     */
    router.get('/getPositions',async function(req, res) {
        try{
            let positionsInfo = await position.getPositions();
            res.json(positionsInfo);
        } catch (err){
            res.json({ isSuccess: false, message: "系统发生错误" });
        }
    });
}