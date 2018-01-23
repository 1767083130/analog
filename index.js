'use strict';

const app = require('express')(),
    kraken = require('kraken-js'),
    options = require('./lib/spec')(app),
    nunjucks = require('nunjucks'),
    join = require('path').join,
    express = require('express');

 var session = require('express-session');
 var cookieParser = require('cookie-parser');
 
 //新增multer、mongoose
//  var multer = require('multer');  
//  var mongoose = require('mongoose');  
//  global.database = require('./lib/database');  
//  global.db = mongoose.connect("mongodb://localhost:27017/Stock");  

//bodyParser模块来做文件解析，将表单里的数据进行格式化
var bodyParser = require("body-parser"); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));  
// app.use(multer());  
app.use(cookieParser());  


//引用express-session  
app.use(session({
    secret:'secret',
      cookie:{
          maxAge:1000*60*30
      }
}));

app.use(function(req,res,next){
    res.locals.user = req.session.user;
    var err = req.session.error;
    delete req.session.error;
    res.locals.message = "注册成功！";
    if(err){
        res.locals.message = '注册失败！';
    }
    next();     //中间件传递
});


app.use(kraken(options));
app.use('/assets',express.static('assets'));
app.use('/assets',express.static('public'));


nunjucks.configure('./public/templates', {
    autoescape: true,
    express: app
});

app.on('start', function () {
    console.log('Application ready to serve requests.');
    console.log('Environment: %s', app.kraken.get('env:env'));
});

module.exports = app;
