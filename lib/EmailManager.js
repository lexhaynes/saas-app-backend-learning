const mailgun = require('mailgun-js')({
    apiKey: process.env.MAILGUN_API_KEY, 
    domain: process.env.MAILGUN_DOMAIN
});

/* ========== EMAIL ACCOUNT ACTIVATION LINK ========== */
exports.sendAccountActivationEmail = async (user) => {
    const token = user.activationToken;
    const email = user.email;
    const accountActivationLink = process.env.BASE_URL + '/account/activate?token=' + token;

    const emailMsg = {
        from: 'Bookwhim Support <support@bookwhim.com>',
        to: process.env.NODE_ENV === 'production' ? email : 'lex.haynes@gmail.com',
        subject: 'Please verify your Bookwhim account',
        template: "confirm_email",
        'h:X-Mailgun-Variables': JSON.stringify({
            message: "Get started wishing or donating once you have activated your account!",
            activation_link: accountActivationLink,
        })
    };
    
    try {
        const body = await mailgun.messages().send(emailMsg);
        console.log(body);

    } catch (err) {
        console.log(err);
    }
}

/* ========== EMAIL PASSWORD-RESET LINK ========== */
exports.sendPasswordResetEmail = async (user) => {
    const token = user.resetPasswordToken;
    const email = user.email;
    const passwordResetLink = process.env.BASE_URL + '/account/reset-password?token=' + token;

    const emailMsg = {
        from: 'Bookwhim Support <support@bookwhim.com>',
        to: process.env.NODE_ENV === 'production' ? email : 'lex.haynes@gmail.com',
        subject: 'Reset your password for your Bookwhim account',
        template: "reset_password",
        'h:X-Mailgun-Variables': JSON.stringify({
            password_reset_link: passwordResetLink,
        })
    };
    
    try {
        const body = await mailgun.messages().send(emailMsg);
        console.log(body);

    } catch (err) {
        console.log(err);
    }
}
