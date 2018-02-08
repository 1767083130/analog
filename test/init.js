'use strict';
//require('./index');
const co = require('co');
const mongoose = require('mongoose');
const customConfig = require('../config/customConfig');
const database = require('../lib/database');
const crypto = require('../lib/crypto');

let cryptConfig = customConfig.bcrypt;
crypto.setCryptLevel(cryptConfig.difficulty);

let dbConfig = customConfig.databaseConfig;
database.config(dbConfig);

const testUtil = require('./testUtil');
const db = mongoose.connection;
db.once('open',function callback(){
    console.log('数据库成功连接');

    co(function *(){
        yield* testUtil.init();
    }.bind(this)).catch(function(e){
    });
});

