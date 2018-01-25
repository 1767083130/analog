'use strict';

const passport = require('passport');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


module.exports = function (router) {
    
    /**
     * Display the login page. We also want to display any error messages that result from a failed login attempt.
     * 进入页面
     */
    router.get('/', function (req, res,next) {
       
        let model = {
           // name:'server'
        };
        //Include any error messages that come from the login process.
        model.messages = req.flash('error');
        res.render('login', model);
        next();
    });
    
    router.get('/prompt',function(req,res){
        let model = {
            
        };

        model.messages = req.flash('error');
        res.render('liaotianshi', model); 
    })
    
       
    /**
     * Receive the login credentials and authenticate.
     * Successful authentications will go to /profile or if the user was trying to access a secured resource, the URL
     * that was originally requested.
     *
     * Failed authentications will go back to the login page with a helpful error message to be displayed.
     */
    router.post('/', function (req, res) {
        passport.authenticate('local', {
            successRedirect: req.session.goingTo || '/account',
            failureRedirect: '/login',
            failureFlash: true
        })(req, res);
    });

    router.post('/prompt',function(req,res){
        
        
        res.render('prompt',{});
         
     })
     
};
