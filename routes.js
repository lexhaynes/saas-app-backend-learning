const passport = require('passport');
const authController = require('./controllers/authController');
const checkAuth = passport.authenticate('jwt', { session: false });

/* HOW TO TEST THESE ROUTES:
    curl http://localhost:[PORT_NUMBER]/test-url
    $ curl http://localhost:3001/test-url
    $ curl -X POST url
*/

function addRoutes(app) {

    app.all('*', (req, res, next) => {
        console.log(req.method + ' ' + req.url);
        next();
    });

    //register users
    /*
        param 1: api endpong
        param 2: middleware that uses a controller function 
    */
    app.post('/api/register', authController.register);

    //login users
    /*
        param 1: api endpoint
        param 2: middleware that uses a controller function 
    */
    app.post('/api/login', authController.login);

    app.post('/api/account-activate', authController.accountActivate);
    app.post('/api/resend-activation-link', authController.resendActivationLink);
    app.post('/api/reset-password-link', authController.resetPasswordLink);

    //authorize your user - check that the user sending requests to server is authorized to view this route

    /*
        summary of this route:
        1. call route
        2. run first middleware, checkAuth 
            - checkAuth uses the jwtAuth strategy defined in lib/passport.js
            - remember that this jwt auth strategy compares the JWT token saved to the client, 
            either stored in a cookie or sent via an Authorization Header, 
            with the JWT token that was created when the user logged in.
            - checkAuth, if successful, returns the user object from the DB
        3. run second middleware, authController.testAuth
            - returns a {isLoggedIn: true/false} based on whether or not previous middleware
            successfully returned a user object
    */
    app.get('/api/test-auth', checkAuth, authController.testAuth);
    //if you ahve other protected routes, you can use the same middleware,
    //e.g: app.get('/api/protected-route', checkAuth, authController.testAuth);
    //e.g: app.get('/api/another-protected-route', checkAuth, authController.testAuth);

}

const routes = {
    addRoutes
};

module.exports = routes;

