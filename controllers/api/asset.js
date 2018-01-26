'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Account  = mongoose.model('Account');
const ClientIdentifier  = mongoose.model('ClientIdentifier');
const TransferStrategy = mongoose.model('TransferStrategy');
const Strategy = mongoose.model('Strategy');

const async = require('co').wrap;
const only = require('only');
const Decimal = require('decimal.js');

module.exports = function (router) {
  
    /**
     * 获取账户详情，包括资产情况和单向持有各个币的情况
     */
    router.get('/getAccountInfo',  async(function* (req, res) {
        res.json({
            asset: {
                total: 34343423,
                lastTotal: 342432
            },
            coins: [
                { coin: "btc", amount: 10 }, 
            ]
        });
    }));
}