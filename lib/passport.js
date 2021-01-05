const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

//Before asking Passport to authenticate a request, 
//the strategy used by an application must be configured.

/* ========== LOGIN STRATEGY: options and strategy */
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
            const errorObject = {
                error: true,
                errors: [{
                    code: 'AUTH_ERROR',
                    field: 'email',
                    errorMsg: 'This email/password combination could not be verified. Please try again.' 
                }]
            };

          return done(null, false, errorObject);
        }
        
        //if a user is found, proceed with validation
        //we added this comparePassword function to the User model's methods
        user.comparePassword(password, function(err, isMatch) {
     

            if(err) {
                const errorObject = {
                    error: true,
                    errors: [{
                        code: 'AUTH_ERROR',
                        errorMsg: err
                    }]
                };

                return done(errorObject);
            }
            
            if (!isMatch) {
                //if passwords don't match
                const errorObject = {
                    error: true,
                    errors: [{
                        code: 'GLOBAL_ERROR',
                        errorMsg: 'This email/password combination could not be verified. Please try again.' 
                    }]
                };

                done(null, null, errorObject);
                return;
            }

            //if there is a match
            done(null, user);
            return;
        });
        
      });
    }
);


/* ========== JWT AUTH STRATEGY: options and strategy */
const jwtOptions = {
    //jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    jwtFromRequest: (req) => {
        const cookies = req.cookies;
        const token = cookies.token;

        if (token) return token;

        const headers = req.headers || {};
        const authHeader = headers.authorization || '';
        const headerToken = authHeader.split(" ")[1];
        if (headerToken) return headerToken;

        return null;
    },
    secretOrKey: process.env.JWT_SECRET,
};

const jwtAuth = new JwtStrategy(jwtOptions, function(jwtPayload, done) {
    const userId = jwtPayload._id;
    //get a User object by userId stored in JWT token
    User.findById(userId, function(err, user) {
        if (err) {
            return done(err, false);
        }
        //if we get no error and the user is found - aka: SUCCESS!
        if (user) {
            return done(null, user);
        } else { //if we get no error and no user with a matching jwt token -- aka possible hack here
            const errorObject = {
                error: true,
                errors: [{
                    code: 'GLOBAL_ERROR',
                    errorMsg: 'Something went wrong.' 
                }]
            };
            
            return done(null, false, errorObject);
            
        }
    });
});

passport.use(localLogin);
passport.use(jwtAuth);

