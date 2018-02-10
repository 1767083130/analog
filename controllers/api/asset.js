'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const only = require('only');
const Decimal = require('decimal.js');
const asset = require('../../lib/asset');

module.exports = function (router) {
  
    /**
     * 获取账户资产详情
     * http://localhost:4000/api/asset/getTotalAsset
     */
    router.get('/getTotalAsset',async function(req, res) {
        try{
            let assetInfo = await asset.getTotalAsset();
            res.json(assetInfo);
        } catch (err){
            res.json({ isSuccess: false, message: "系统发生错误" });
        }
    });

    /**
     * 获取用户资产详情
     * http://localhost:4000/api/asset/getUserAsset
     */
    router.get('/getUserAsset',async function(req, res) {
        try{
            let userAssetInfo = await asset.getUserAsset();
            res.json(userAssetInfo);
        } catch (err){
            res.json({ isSuccess: false, message: "系统发生错误" });
        }
    });
}