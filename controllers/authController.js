
//this is an express middleware wherein we take in data from the http request and do some middleware magic on it
//the middleware magic is validation

const validateEmail = require('../utils').validateEmail;
const validatePassword = require('../utils').validatePassword;
const User = require('../models/User');
const passport = require('passport');
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

/* ========== LOGIN CONTROLLER */
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
            token:jwtToken //<-- this token can be stored in a cookie or localStorage  
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

module.exports = {
    register, login, testAuth
};
