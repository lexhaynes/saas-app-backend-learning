
//this is an express middleware wherein we take in data from the http request and do some middleware magic on it
//the middleware magic is validation

const validateEmail = require('../utils').validateEmail;
const validatePassword = require('../utils').validatePassword;
const User = require('../models/User');
const passport = require('passport');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/* ========== REGISTER CONTROLLER */
const register = async (req, res, next) => {
    const {email, password } = req.body;

    /* Validate fields */
    const validationErrors = validateFields({
        email, 
        password
    });


     /* Send any validation errors back to client */ 
    if (validationErrors.length) {
        const errorObject = {
            error: true,
            errors: validationErrors
        }
         
        res.status(422).send(errorObject);
        return; //<-- this has to be here so we exit the register function before running the monngo middleware below
    }


    /* Save user info to database */
    //first make sure no other user exists with the same email address
    try {
        const existingUser = await User.findOne({
            email //<-- shortening of email: email
        })
        //if a user is found with the email addresss -- aka a user is registered with that email address already --, do not proceed with saving user to db
        if (existingUser) {
            const errorObject = {
                error: true,
                errors: [{
                        errorCode: 'VALIDATION_ERROR',
                        errorMsg: 'This email address already exists. Please use another email address.',
                        field: 'email'
                    }]
            };
            //status 422 is an unprocessable entity - which means server recieved request but did not process it.
            res.status(422).send(errorObject);
            return;
        }

        //if user is NOT found, create new User object
        //remember that these fields have to match the model object (aka the User Schema)
        let user = new User({
            email, //<-- shorthand for email: email (from the request body)
            password, //<-- shorthand for password: password (from the request npdy)
            activated: false,
            activatedAt: Date.now(),
            activationToken: uuidv4(),
           // activationTokenSentAt: Date.Now(),
        });

        //save to db
        const savedUser = await user.save();

        //send response to client 
        res.status(200).send({
            message: "User created successfully!",
            user: User.toClientObject(savedUser) //<-- send back relevant fields from db using helper function set in User model
        });
        
    } catch(err) {
        res.status(422).send("error trying to save user info to database: " + err)
    }
  
}

/* ========== LOGIN CONTROLLER ========== */
const login = async (req, res, next) => {
    const {email, password } = req.body;

    /* Validate fields */
    const validationErrors = validateFields({
        email, 
        password
    });


     /* Send any validation errors back to client */ 
    if (validationErrors.length) {
        const errorObject = {
            error: true,
            errors: validationErrors
        }
         
        res.status(422).send(errorObject);
        return; //<-- this has to be here so we exit the register function before running the monngo middleware below
    }

     /* Check if user's password matches what is in the database */

    //match passwords here
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            res.status(401).send(info);
            return;
        }

        //if a user is found, encrypt the entire user object as a JWT token and send the token back to client.
        const userObject = user.toObject(); //<-- toObject() is a mongoose function
        //extract just the ID from userObject, in order to reduce size of token that is sent back to client.
        const tokenObject = {
            _id: userObject._id,
            //add other fields from user in DB here if you want to send back more data to client
        }
        //send token object that contains JUST the userID
        const jwtToken = jwt.sign(tokenObject, process.env.JWT_SECRET || 'TEMP_JWT_SECRET', {
            expiresIn: 86400, //<-- one day in seconds
        });
        res.status(200).send({
            token:jwtToken, //<-- this token can be stored in a cookie or localStorage  
            accountInfo: User.toClientObject(user) //<-- this data is sent to client upon successful login. may not be necessary.
        });
    
        return;
    })(req, res, next);
        
  
}

/* helper function: validate email/password fields here; used for register and login controllers. */
const validateFields = (fields = {}) => {
    
    const {email, password } = fields;
    const errors = [];

    if (!email) {
        //error object shape below 
        errors.push({
            errorCode: 'VALIDATION_ERROR',
            errorMsg: 'You must provide an email address',
            field: 'email'
        })
    }

    //if email exists on the req body, check if it's valid
    if (email && !validateEmail(email)) {
        errors.push({
            errorCode: 'VALIDATION_ERROR',
            errorMsg: 'The email address you have provided is invalid.',
            field: 'email'
        })
    }

    if (!password) {
        errors.push({
            errorCode: 'VALIDATION_ERROR',
            errorMsg: 'You must provide a password',
            field: 'password'
        })
    }

    //validate password
    if (password && !validatePassword(password)) {
        errors.push({
            errorCode: 'VALIDATION_ERROR',
            errorMsg: 'The password you have provided is invalid. Please make sure your password follows the password rules.',
            field: 'password'
        })
  }

  return errors;

}

/* ========== CONFIRM LOGGED IN CONTROLLER: authorize that the user is logged in */
const testAuth = async (req, res, next) => {
    console.log('req.user: ' + req.user)
    
    //if user is available, user is logged in (but how do we make this correlation? 
    //answer: because there is another middleware running before this method is called
    res.send({
        isLoggedIn: req.user ? true: false
    });
}

/* ========== ACTIVATE USER ACCOUNT CONTROLLER ========== */
const accountActivate = async (req, res, next) => {
    const {
        activationToken
    } = req.body;

    const errorObject = {
        error: true,
        errors: [{
                errorCode: 'VALIDATION_ERROR',
                errorMsg: 'There was a problem activating your account.',
            }]
    };

    //return error if there is no activation token
    if (!activationToken) {
        //status 422 is an unprocessable entity - which means server recieved request but did not process it.
        res.status(422).send(errorObject);
        return;
    }

    //otherwise, proceed
    try { //find user by activationToken sent in the request
        const user = await User.findOne({
            activationToken //<-- activationToken (field were searching by): activationToken (from request)
        });

        //if no user is returned, it means the client sent an invalid activation token
        if (!user) {
            res.status(422).send(errorObject);
            return;
        }

        //user IS returned! so now update data.
        user.activated = true;
        user.activatedAt = Date.now();
        user.activationToken = undefined;

        const savedUser = await user.save();

        return res.send({
            message: 'Your account has been activated! Please log in.', //<-- you can also automatically log in the user upon successful actiavtion
            email: savedUser.email //<-- this data is sent to client upon successful login. may not be necessary.

        });

    } catch (e) {
        console.log(e);
        res.status(500).send({
            error: e
        });
    }


}

/* ========== RE-SEND ACCOUNT ACTIVATION LINK CONTROLLER ========== */
const resendActivationLink = async (req, res, next) => {
    const {
        email
    } = req.body;

    const errorObject = {
        error: true,
        errors: [{
                errorCode: 'VALIDATION_ERROR',
                errorMsg: 'Please specify the email address that needs activation.',
            }]
    };

    //validate that the email has been returned from request
    if (!email) {
        res.status(422).send(errorObject);
        return;
    }
    
    //if user has specified an email address, retrieve it from the database
    try {
        //find user by email sent in the request
        const user = await User.findOne({
            email //<-- email (field were searching by): email (from request)
        });

         // if no user is returned, it means the email address sent by client is not in database
         // for security purposes, ignore this case. 
         // we don't want to let potential hax0r know that this email isn't in the db.
         // server will just time out
       /*  if (!user) {
            return;
        } */
         
        //if we get a user back and user is not activated, update activation token in db
        if (user && !user.activated) {
            user.activationTokenSentAt = Date.now();
            user.activationToken = uuidv4();

            await user.save();

            //Send activation email here
        }

        //note that success message gets returned whether email was found or not, for security reasons.
        return res.send({
            message: 'Activation link has been sent.'
        });
        
    } catch(e) {
        console.log(e);
        res.status(500).send({
            error: e
        });
    }
    
}

/* ========== RE-SEND SET-PASSWORD LINK CONTROLLER ========== */
const resetPasswordLink = async (req, res, next) => {
    const {
        email
    } = req.body;

    const errorObject = {
        error: true,
        errors: [{
                errorCode: 'VALIDATION_ERROR',
                errorMsg: 'Please specify an email address.',
            }]
    };

    //validate that the email has been returned from request
    if (!email) {
        res.status(422).send(errorObject);
        return;
    }
    
    //if user has specified an email address, retrieve it from the database
    try {
        //find user by email sent in the request
        const user = await User.findOne({
            email //<-- email (field were searching by): email (from request)
        });
        
        //ignore 'user is not found' case to prevent hax0rs from knowing which emails are in the db
      
        //if we get a user back, reset password
        if (user) {
            //if resetPasswordTokenSentAt was sent less than 10 minutes ago, do not generate a new token and send error.
            if (user.resetPasswordTokenSentAt) {
                const tokenLastSent = moment(user.resetPasswordTokenSentAt);
                const rightNow = moment();
                const difference = rightNow.diff(tokenLastSent);
                const MIN_WAIT_TIME = 600000; //10 minutes in miliseconds
                //console.log(difference/1000);
                if (difference < MIN_WAIT_TIME) {
                    res.status(422).send({
                        error: true,
                        errors: [{
                                errorCode: 'VALIDATION_ERROR',
                                errorMsg: 'Your reset link has already been sent. Please wait for your email to arrive.',
                            }]
                    });
                    return;
                }
    
            }
            
            user.resetPasswordToken = uuidv4();
            user.resetPasswordTokenSentAt = Date.now();

            await user.save();

            //Send reset passwprd email here
        }

        //note that success message gets returned whether email was found or not, for security reasons.
        return res.send({
            message: 'Reset-password link has been sent.'
        });
       
        
    } catch(e) {
        console.log(e);
        res.status(500).send({
            error: e
        });
    }
    
}


module.exports = {
    register, login, testAuth, accountActivate, resendActivationLink, resetPasswordLink
};
