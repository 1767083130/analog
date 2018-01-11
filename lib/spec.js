'use strict';

const express = require('express'),
    passport = require('passport'),
    auth = require('../lib/auth'),
    userLib = require('./user')(),
    db = require('../lib/database'),
    customConfig = require('../config/customConfig'),
    crypto = require('../lib/crypto');

//add socket service ,why to add in here?because this mongodb model don't upload before.
const socServer = require('./server/server');


module.exports = function spec(app) {
    app.on('middleware:after:session', function configPassport(eventargs) {
        //Tell passport to use our newly created local strategy for authentication
        passport.use(auth.localStrategy());
        //Give passport a way to serialize and deserialize a user. In this case, by the user's id.
        passport.serializeUser(userLib.serialize);
        passport.deserializeUser(userLib.deserialize);
        app.use(passport.initialize());
        app.use(passport.session());
    });
    return {
        onconfig: function(config, next) {
            let cryptConfig = config.get('bcrypt');
            crypto.setCryptLevel(cryptConfig.difficulty);

            let dbConfig = customConfig.databaseConfig;
            db.config(dbConfig);
            console.log(`成功连接数据库${dbConfig.database}...`);

            //connect socket service ,for mongoose model has be uploaded;
            //this code position write before
            socServer.conection();

            // userLib.addUsers();
            // console.log(`成功添加几个测试用户...`);
            next(null, config);
        }
    };

};
