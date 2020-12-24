const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

let User;

//only define User model if it doesn't already exist
if (!User) {
    let userSchema = new Schema({
        email: { 
            type: String, 
            required: true,
            lowercase: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps:true
    });

    
    //before we save to the db, run this middleware, a pre hook
    // see: https://mongoosejs.com/docs/middleware.html#pre
    userSchema.pre('save', function(next) {
        const user = this;
        const SALT_FACTOR = 5;

        //only encrypt the password if the password is changing; e.g. when user is creating new account password or when user is updating password
        //if the password has NOT changed, execute the callback.
        if (!user.isModified('password')) {
            return next();
        }   

        bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
            //halt execution if there is an error
            if (err) return next(err);

            //otherwise generate the hash
            bcrypt.hash(user.password, salt, function(err, hash) {
                //halt execution if there is an error
                if (err) return next(err);
                user.password = hash;

                next();
            })
        })
       
      });

    //make sure you add all your hooks above before calling mongoose.model
    //further reading on mongoose models: https://mongoosejs.com/docs/models.html
    User = mongoose.model('User', userSchema);
}

module.exports = User;