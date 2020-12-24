
//this is an express middleware wherein we take in data from the http request and do some middleware magic on it
//the middleware magic is validation

const validateEmail = require('../utils').validateEmail;
const validatePassword = require('../utils').validatePassword;
const User = require('../models/User');
const passport = require('passport');


/* register controller */
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
                        errorMsg: 'The email address you have provided already exists. Please use another email address.',
                        field: 'email'
                    }]
            };
            //status 422 is an unprocessable entity - which means server recieved request but did not process it.
            res.status(422).send(errorObject);
            return;
        }

        //if user is NOT found, create new uer object
        //remember that these fields have to match the model object (aka the User Schema)
        let user = new User({
            email, //<-- shorthand for email: email
            password //<-- shorthand for password: password
        });

        //save to db
        const savedUser = await user.save();

        //send response to client 
        res.status(200).send("User created successfully!")
        
    } catch(err) {
        res.status(422).send("error trying to save user info to database: " + err)
    }
  
}

/* login controller */
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

        /* if(user) {
            //send JWT token to client
        } */

        //testing
        res.status(200).send(user);
        return;
    })(req, res, next);
        
  
}

/* validate shared fields here */
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

module.exports = {
    register, login
};

