require('dotenv').config();
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const addRoutes = require('./routes').addRoutes;
const databaseSetup = require('./db/databaseSetup');
const passport = require('./lib/passport');


const PORT_NUMBER = process.env.LOCAL_PORT;

/* don't forget to start mongodb server!!!!
run mongod

*/


const app = express();

app.use(compression());
app.use(bodyParser.json({
    limit: '5mb'
}));
app.use(cookieParser());


addRoutes(app);

app.listen(PORT_NUMBER, () => {
    console.log('Express server started on port: ', PORT_NUMBER)
});

//process is a global function provided by nodejs
process.on('uncaughtException', (error) => {
    console.log("An uncaughtException error accured " + error);
  });