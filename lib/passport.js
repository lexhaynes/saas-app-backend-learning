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
    secretOrKey: process.env.JWT_SECRET || 'TEMP_JWT_SECRET',
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
            return done(null, false, {
                code: "GLOBAL_ERROR",
                message: "This email does not belong to any account."
            });
            
        }
    });
});

passport.use(localLogin);
passport.use(jwtAuth);

