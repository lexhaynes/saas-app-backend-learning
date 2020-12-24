
//this is an express middleware wherein we take in data from the http request and do some middleware magic on it
//the middleware magic is validation

const validateEmail = require('../utils').validateEmail;
const validatePassword = require('../utils').validatePassword;
const User = require('../models/User');

class ErrorObject {
    constructor(errorCode, errorMsg, field) {
      this.errorCode = errorCode;
      this.errorMsg = errorMsg;
      this.field = field;
    }
  }

const register = async (req, res, next) => {
    const {email, password } = req.body;

    //validate input fields
    const validationErrors = [];

    validationErrors.push(
        isEmailEmpty(email),
    )

    //if we have validation errors, send them back to caller 
    if (validationErrors.length) {
        const errorObject = {
            error: true,
            errors: validationErrors
        }
         
        res.status(422).send(errorObject);
        //return; //<-- not sure why this has to be here...?
    }


    //Save user info to database

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

const login = async (req, res, next) => {

}

/* common functions */


//check if email field is empty
const isEmailEmpty = (email) {
    if (!email) {
        return new ErrorObject(
            'VALIDATION_ERROR',
            'You must provide an email address',
            'email'
        )
    }  
};


//if email exists on the req body, check if it's valid
const isEmailValid = (email) {
    if (email && !validateEmail(email)) {
        return new ErrorObject(
            'VALIDATION_ERROR',
            'The email address you have provided is invalid.',
            'email'
        )
    }
}

//check if password field is empty
const isPasswordEmpty = (password) {
    if (!password) {
        return new ErrorObject(
            'VALIDATION_ERROR',
            'You must provide a password',
            'password'
        )
    }
}

//check if password is valid
const isPasswordValid = (password) {
    if (password && !validatePassword(password)) {
        validationErrors.push({
            errorCode: 'VALIDATION_ERROR',
            errorMsg: 'The password you have provided is invalid. Please make sure your password follows the password rules.',
            field: 'password'
        })
    }
}


module.exports = {
    register, login
};

