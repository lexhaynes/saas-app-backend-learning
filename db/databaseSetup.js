const mongoose = require('mongoose');
const databaseURL = 'mongodb://localhost/saasCodeAlong';
mongoose.Promise = Promise;

mongoose.connect(databaseURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("successfully connected to database");
    })
    .catch((err) => {
        console.log("error connecting to database: ", err);
    })