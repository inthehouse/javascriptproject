var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var expressValidator = require('express-validator');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');

var bcrypt = require('bcrypt');
const saltRounds = 10;


//Set up data connection
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'ASSESS_EASY'
});



/* GET home page. */

router.get('/', function(req, res) {

    res.render('home', {title : "Home"});
});


router.get('/registration', function(req, res) {

    res.render('registration', {title : "Registration"});
});

router.get('/login', function(req, res) {

    res.render('login', {title : "Login"});
});

router.get('/stu_teach_dashboard', authenticationMiddleware(), function(req, res) {

    res.render('stu_teach_dashboard', {title : "Dashboard"});
});



router.post('/login',
    passport.authenticate('local'), function(req, res) {
        connection.query('select * from users inner join user_access on user_access.userID = users.userID inner join access_level on access_level.accessID = user_access.accessID where users.userID=' +res.req.user.user_id,
            function (err, userAcessInfo) {
                if (err) throw err;
                for (var i in userAcessInfo) {
                    var acessType = userAcessInfo[i].accessType;
                }
                if(acessType === '1'){
                    res.redirect('/teacher_d');
                } else {
                    res.redirect('/student_dashboard');
                }
                });
    });

router.get('/logout', function(req, res) {
    req.logout();
    req.session.destroy();
    res.redirect('/');
});

passport.use(new LocalStrategy({
    usernameField: 'email'
},
    function(email, password, done){
       console.log(email);
       console.log(password);
        const db = "SELECT userID, password FROM users WHERE email = ?";
        connection.query(db, [email], function(err, results, fields) {
           if (err) {done(err)};

           if (results.length === 0) {
                done(null, false);
            } else {
               const hash = results[0].password.toString();

               bcrypt.compare(password, hash, function (err, response) {
                   if (response === true) {
                       return done(null, {user_id: results[0].userID});
                   } else {
                       return done(null, false);
                   }
               });

           }
        })


    }
));


router.post('/registration', function(req, res) {

    req.checkBody('firstName', 'Firstname field cannot be empty.').notEmpty();
    req.checkBody('lastName', 'Lastname field cannot be empty.').notEmpty();
    req.checkBody('email', 'The email you entered is invalid. Please try again.').isEmail();
    req.checkBody('email', 'Your email must be FH email. Please use your FH email address.').matches(/^[\w\.\+_-]+[\w]+@(student.fh-kiel|fh-kiel)\.de$/);
    req.checkBody('password', 'Password must be between 6 to 100 characters long.').len(6, 100);
    req.checkBody('passwordMatch', 'Password must be between 6 to 100 character long.').len(6, 100);
    req.checkBody('passwordMatch', 'Passwords do not match, please try again.').equals(req.body.password);


        const errors = req.validationErrors();
        if (errors){
            console.log('errors:' + JSON.stringify(errors));
            res.render('registration', {
                title: 'Registration Error',
                //erro1: 'Firstname field cannot be empty.',
                errors: errors

            });
          //  console.log(errors.toString());
        }
        else{
            const firstName = req.body.firstName;
            const lastName = req.body.lastName;
            const email = req.body.email;
            const password = req.body.password;

            const insertuser = "INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)";
            const validuser = "SELECT LAST_INSERT_ID() as user_id";

            bcrypt.hash(password, saltRounds, function(err, hash) {
                connection.query(insertuser, [firstName, lastName, email, hash], function (error, results, fields) {
                    if (error) throw error;

                    connection.query(validuser, function(error, results, fields) {
                        if (error) throw error;

                        const user_id =results[0];
                        console.log(results[0]);
                        req.login(user_id, function(err) {
                            res.redirect('/student_dashboard');
                        });


                        //res.render('stu_teach_dashboard', {title: "Success"});
                    });


                })
            });
        }





});

passport.serializeUser(function(user_id, done) {
    done(null, user_id);
});
passport.deserializeUser(function(user_id, done) {
    done(null, user_id);
});

function authenticationMiddleware() {
    return (req, res, next) => {
        console.log(`
        req.session.passport.user:) ${JSON.stringify(req.session.passport)}`);
         if (req.isAuthenticated()) return next();
         res.redirect('/login')
        
    }
}

module.exports = router;