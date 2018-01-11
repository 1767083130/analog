'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// const Account  = mongoose.model('Account');//账户
// //const RealTimePrice = mongoose.model('RealTimePrice');//市场及时价格信息
// const Strategy = mongoose.model('Strategy');//市场策略
// const ManualTask = mongoose.model('ManualTask');//需要人工处理的任务
// const TransferStrategy = mongoose.model('TransferStrategy');//转移策略
const express = require('express'),
      passport = require('passport'),
      db = require('../lib/database');
