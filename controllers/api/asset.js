'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const only = require('only');
const Decimal = require('decimal.js');
const asset = require('../../lib/asset');

module.exports = function (router) {
  
    /**
     * 获取账户资产详情
     * http://192.168.0.102:4000/api/asset/getTotalAsset
     */
    router.get('/getTotalAsset',async function(req, res) {
        let assetInfo = await asset.getTotalAsset();
        res.json(assetInfo);
    });

    /**
     * 获取用户资产详情
     * http://192.168.0.102:4000/api/asset/getTotalAsset
     */
    router.get('/getTotalAsset',function(req, res) {
        let userAssetInfo = asset.getUserAsset();
        res.json(userAssetInfo);
    });
}