// utility functions!

// validate email string
const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

//TODO: add strength/length validation for password
//validate password. make this better lololol.
const validatePassword = (pass) => {
    return pass.length > 1 ? true : false;
}

module.exports = {
    validateEmail,
    validatePassword
}