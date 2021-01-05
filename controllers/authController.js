
//this is an express middleware wherein we take in data from the http request and do some middleware magic on it
//the middleware magic is validation

const validateEmail = require('../utils').validateEmail;
const validatePassword = require('../utils').validatePassword;
const User = require('../models/User');
const passport = require('passport');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const formatApiResponse = require('../lib/formatApiResponse').formatApiResponse;
const APIResult = require('../lib/formatApiResponse').APIResult;

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
        res.status(422).send(formatApiResponse('ERROR', validationErrors));
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
            const code = 'VALIDATION_ERROR';
            const msg = 'This email address already exists. Please use another email address.';
            const results = [new APIResult(code, msg)];
                
            res.status(422).send(formatApiResponse('ERROR', results));
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
        const code = 'REGISTRATION_SUCCESS';
        const msg = 'You have successfully registered an accout.';
        const data = User.toClientObject(savedUser); //<-- send back relevant fields from db using helper function set in User model
        const results = [new APIResult(code, msg, data)];
            
        res.status(200).send(formatApiResponse('SUCCESS', results));

        
    } catch(err) {
        const code = 'VALIDATION_ERROR';
        const msg = err;
        const results = [new APIResult(code, msg)];
            
        res.status(422).send(formatApiResponse('ERROR', results));
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
        res.status(422).send(formatApiResponse('ERROR', validationErrors));    
        return; //<-- this has to be here so we exit the register function before running the monngo middleware below
    }

     /* Check if user's password matches what is in the database */

    //match passwords here
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            const code = 'GLOBAL_ERROR';
            const msg = 'Something went wrong';
            const results = [new APIResult(code, msg, info)];
                
            res.status(401).send(formatApiResponse('ERROR', results));
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
        const jwtToken = jwt.sign(tokenObject, process.env.JWT_SECRET, {
            expiresIn: 86400, //<-- one day in seconds
        });

        res.status(200).send({
            token:jwtToken, //<-- this token can be stored in a cookie or localStorage  
            accountInfo: User.toClientObject(user) //<-- this data is sent to client upon successful login. may not be necessary.
        });
    
        return;
    })(req, res, next);
        
  
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


    //return error if there is no activation token
    if (!activationToken) {

        const code = 'VALIDATION_ERROR';
        const msg = 'There was a problem activating your account.';
        const results = [new APIResult(code, msg)];
            
        res.status(422).send(formatApiResponse('ERROR', results));
        
        return;
    }

    //otherwise, proceed
    try { //find user by activationToken sent in the request
        const user = await User.findOne({
            activationToken //<-- activationToken (field were searching by): activationToken (from request)
        });

        //if no user is returned, it means the client sent an invalid activation token
        if (!user) {
            const code = 'VALIDATION_ERROR';
            const msg = 'There was a problem activating your account.';
            const results = [new APIResult(code, msg)];
                
            res.status(422).send(formatApiResponse('ERROR', results));
            return;
        }

        //user IS returned! so now update data.
        user.activated = true;
        user.activatedAt = Date.now();
        user.activationToken = undefined;

        const savedUser = await user.save();

        const code = 'ACCOUNT_ACTIVATION_SUCCESS';
        const msg = 'Your account has been successfully activated!';
        const data = {email: savedUser.email};
        const results = [new APIResult(code, msg, data)];
            
        res.send(formatApiResponse('SUCCESS', results));

    } catch (err) {
        const code = 'GLOBAL_ERROR';
        const msg = err;
        const results = [new APIResult(code, msg)];
            
        res.status(500).send(formatApiResponse('ERROR', results));
    }


}

/* ========== RE-SEND ACCOUNT ACTIVATION LINK CONTROLLER ========== */
const resendActivationLink = async (req, res, next) => {
    const {
        email
    } = req.body;


    //validate that the email has been returned from request
    if (!email) {
        const code = 'VALIDATION_ERROR';
        const msg = 'Please specify the email address that needs activation.';
        const results = [new APIResult(code, msg)];
            
        res.status(422).send(formatApiResponse('ERROR', results));
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
        const code = 'ACTIVATION_SUCCESS';
        const msg = 'Activation link has been emailed to you.';
        const results = [new APIResult(code, msg)];
            
        return res.send(formatApiResponse('SUCCESS', results));
        
    } catch(err) {
        const code = 'GLOBAL_ERROR';
        const msg = err;
        const results = [new APIResult(code, msg)];
            
        res.status(500).send(formatApiResponse('ERROR', results));
    }
    
}

/* ========== EMAIL RESET-PASSWORD LINK CONTROLLER - send password token to email ========== */
const resetPasswordLink = async (req, res, next) => {
    const {
        email
    } = req.body;

        

    //validate that the email has been returned from request
    if (!email) {
        const code = 'VALIDATION_ERROR';
        const msg = 'Please specify an email address.';
        const results = [new APIResult(code, msg)];
            
        res.status(422).send(formatApiResponse('ERROR', results));
        return;
    }
    
    //if user has specified an email address, retrieve it from the database
    try {
        //find user by email sent in the request
        const user = await User.findOne({
            email //<-- email (field were searching by): email (from request)
        });
        
        //ignore 'user is not found' case to prevent hax0rs from knowing which emails are in the db
      
        //if we get a user back, send the reset password token
        if (user) {
            //if resetPasswordTokenSentAt was sent less than 10 minutes ago, do not generate a new token and send error.
            if (user.resetPasswordTokenSentAt) {
                const tokenLastSent = moment(user.resetPasswordTokenSentAt);
                const rightNow = moment();
                const difference = rightNow.diff(tokenLastSent);
                const MIN_WAIT_TIME = 600000; //10 minutes in miliseconds
                //console.log(difference/1000);
                if (difference < MIN_WAIT_TIME) {
                    const code = 'VALIDATION_ERROR';
                    const msg = 'Your reset link has already been sent. Please wait for your email to arrive.';
                    const results = [new APIResult(code, msg)];
                        
                    res.status(422).send(formatApiResponse('ERROR', results));
                    return;
                }
    
            }
            
            user.resetPasswordToken = uuidv4();
            user.resetPasswordTokenSentAt = Date.now();

            await user.save();

            //Send reset password email here
        }

        //note that success message gets returned whether email was found or not, for security reasons.
        const code = 'ACTIVATION_SUCCESS';
        const msg = 'Activation link has been emailed to you.';
        const results = [new APIResult(code, msg)];
            
        return res.send(formatApiResponse('SUCCESS', results));

        
    } catch(err) {
        const code = 'GLOBAL_ERROR';
        const results = [new APIResult(code, err)];
            
        res.status(500).send(formatApiResponse('ERROR', results));
    }
    
}

/* ========== RESET PASSWORD CONTROLLER ========== */
const resetPassword = async (req, res, next) => {
    const {
        resetPasswordToken,
        password 
    } = req.body;

    const validationErrors = [];


     //return error if there is no password token
     if (!password || !resetPasswordToken) {
        const code = 'VALIDATION_ERROR';
        const msg = 'Your password could not be updated.';
        validationErrors.push(new APIResult(code, msg));
    }

    //return errors to client if they exist
    if (validationErrors.length) {
        return res.status(422).send(formatApiResponse('ERROR', validationErrors));
    }

    //otherwise, proceed
    try { //find user by resetPasswordToken sent in the request
        const user = await User.findOne({
            resetPasswordToken //<-- activationToken (field were searching by): activationToken (from request)
        });
        
        if (!user) {
            //TODO: possibly send an error back to client
            throw 'Error updating password.';
        }

        //if user is found, update password
        if (user) {
            user.password = password;
            user.resetPasswordToken = undefined;
            
            await user.save();

            const code = 'RESET_PASSWORD_SUCCESS';
            const msg = 'Your password has been updated.';
            const results = [new APIResult(code, msg)];
                
            return res.send(formatApiResponse('SUCCESS', results));
        }
    } catch (err) {
        const code = 'GLOBAL_ERROR';
        const results = [new APIResult(code, err)];
            
        res.status(500).send(formatApiResponse('ERROR', results));
    }

}

/* helper function: validate email/password fields here; used for register and login controllers. */
const validateFields = (fields = {}) => {
    
    const {email, password } = fields;
    const errors = [];

    if (!email) {
        const code = 'VALIDATION_ERROR';
        const msg = 'You must provide an email address';
        const Result = new APIResult(code, msg);
        errors.push(Result);
    }

    //if email exists on the req body, check if it's valid
    if (email && !validateEmail(email)) {
        const code = 'VALIDATION_ERROR';
        const msg = 'The email address you have provided is invalid.';
        const Result = new APIResult(code, msg);
        errors.push(Result);
    }

    if (!password) {
        const code = 'VALIDATION_ERROR';
        const msg = 'You must provide a password';
        const Result = new APIResult(code, msg);
        errors.push(Result);
    }

    //validate password
    if (password && !validatePassword(password)) {
        const code = 'VALIDATION_ERROR';
        const msg = 'The password you have provided is invalid. Please make sure your password follows the password rules.';
        const Result = new APIResult(code, msg);
        errors.push(Result);
  }

  return errors;

}


module.exports = {
    register, 
    login, 
    testAuth, 
    accountActivate, 
    resendActivationLink, 
    resetPasswordLink, 
    resetPassword
};
