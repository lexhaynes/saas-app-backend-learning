const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

//Before asking Passport to authenticate a request, 
//the strategy used by an application must be configured.

const localOptions = {
    usernameField: 'email',
    passwordField: 'password'
};

const localLogin = new LocalStrategy(localOptions,
    function(email, password, done) {
      User.findOne({ email }, function (err, user) {
        if (err) { 
            return done(err);
        }

        //no user with the entered email address was found
        if (!user) {
          return done(null, false, { 
                code: 'AUTH_ERROR',
                field: 'email',
                message: 'This email/password combination could not be verified. Please try again.' 
            });
        }
        
        //if a user is found, proceed with validation
        //we added this comparePassword function to the User model's methods
        user.comparePassword(password, function(err, isMatch) {
            if(err) {
                return done(err);
            }
            
            if (!isMatch) {
                //if passwords don't match
                done(null, null, { 
                    code: 'GLOBAL_ERROR',
                // field: 'password',
                    message: 'This email/password combination could not be verified. Please try again.' 
                });
                return;
            }

            //if there is a match
            done(null, user);
            return;
        });
        
      });
    }
);

passport.use(localLogin);