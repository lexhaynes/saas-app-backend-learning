const authController = require('./controllers/authController');

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

    app.get('/test-url', (req, res, next) => {
        res.send({
            poop:true
        });
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
        param 1: api endpong
        param 2: middleware that uses a controller function 
    */
   app.post('/api/login', authController.login);

}

const routes = {
    addRoutes
};

module.exports = routes;

