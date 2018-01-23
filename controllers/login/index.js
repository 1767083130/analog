'use strict';
const passport = require('passport');

module.exports = function (router) {
    /**
     * Display the login page. We also want to display any error messages that result from a failed login attempt.
     */
    router.get('/', function (req, res) {
        let model = {};
        //Include any error messages that come from the login process.
        model.messages = req.flash('error');
        res.render('login', model);
    });


    
    //register
    router.route("/register").get(function(req,res){
        res.render("register",{title:'user register'});
    }).post(function(req,res){
        
        var user = global.Promise.getModel('user');
        var uname = req.body.uname;
        var upwd = req.body.upwd;
        User.findOne({username:uname},function(err,doc){
            if(err){
                res.send(500);

                req.session.error = '网络异常错误!';
                console.log(err);
            }else if(doc){
                req.session.error = '用户名已存在!';
                res.send(500);
            }else{
                user.create({
                    username: uname,
                    password: upwd
                },function(err,doc){
                    if(err){
                        res.send(500);
                        console.log(err);
                    }else{
                        req.session.error = '用户名创建成功！';
                        res.send(200);
                    }
                });
            }
        });
    });
    

    //test
    router.get('/test', function (req, res) {
        let model = {};
        //Include any error messages that come from the login process.
        model.messages = req.flash('error');
        res.render('test', model);
    });

    router.post('/test', function (req, res) {
        // let model = {};
        // //Include any error messages that come from the login process.
        // model.messages = req.flash('error');
        res.render('test', {});
    });

    //register
    // router.get('/register', function (req, res,next) {
    //     let model = {};
    //     //Include any error messages that come from the login process.
    //     model.messages = req.flash('error');
    //     res.render('register', model);
    //     next();
    // });

    // router.post('/register', function (req, res) {
    //     // let model = {};
    //     // //Include any error messages that come from the login process.
    //     // model.messages = req.flash('error');
    //     res.render('register', {});
    // });
    
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
};
