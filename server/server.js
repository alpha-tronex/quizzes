require("dotenv").config();
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require('fs');
const loginModule = require(`${__dirname}/loginModule.ts`);
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const saltRounds = 10;

// const md5 = require("md5");
// const encrypt = require("mongoose-encryption");
// const session = require("express-session");
// const passport = require("passport");
// const passportLocalMongoose = require("passport-local-mongoose");

// console.log("API_KEY: " + process.env.API_KEY);

const app = express();
const port = 3000;

// filepath: c:\Projects\NODEJS\quizzes\server\server.js
const path = require("path");

// Serve Angular app
app.use(express.static(path.join(__dirname, "../dist/browser"))); // Adjust path to Angular's `dist` folder
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// app.use(session({
//     secret: "Mama mia.",
//     resave: false,
//     saveUninitialized: false
// }));

// app.use(passport.initialize());
// app.use(passport.session());



const userSchema = new mongoose.Schema ({
    username: String,
    email: String,
    password: String
});
// userSchema.plugin(passportLocalMongoose); //will help us to hash and salt password and save users into mongodb database
// const secret = "pointMeInTheDirectionOfAlbuquerque";
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);
// passport.use(User.createStrategy());
 
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
//mongoose.set("useCreateIndex", true);

mongoose.connect("mongodb://localhost:27017/userDB");
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/browser/index.html")); // Adjust path to Angular's `index.html`
});

app.route("/api/register")
    .post((req, res) => {
        try {
            bcrypt.hash(req.body.pass, saltRounds, function(err, hash) {
                const user = new User({
                    username: req.body.uname,
                    email: req.body.email,
                    password: hash
                });
                console.log('before save');

                user.save((err) => {
                    if (err) return console.error(err);
    
                    console.log('username: ' + user.username);
                    console.log('email: ' + user.email);
                    console.log('password: ' + user.password);
    
                    console.log('after save');
                    // res.end('done');
                    res.status(200).send(JSON.stringify("success"));
                })
    
            });



           // mongoose.connection.close();
            
        } catch (err) {
            console.log('err' + err);
            res.status(500).send(err);
        }
    })

app.route("/api/login")
    .post((req,res) => {
    try {
        console.log("uname: " + req.body.uname);
        console.log("pass: " + req.body.pass);
        
        const uname = req.body.uname;
        const pass = req.body.pass;

        // cannot query password field if it is encrypted
        User.findOne({username: uname}, (err, foundUser) => {
            console.log("foundUser: " + foundUser);
            console.log("err: " + err);
            if (err) { 
                console.log(err);
                res.status(500).send(err);
                console.log(err);
            } 
            
            if (foundUser) {
                console.log("in if (foundUser)");
                bcrypt.compare(pass, foundUser.password, function(err, result) {
                    console.log('result: ' + result);
                    console.log('err: ' + err);
                    if (result === true) {
                        res.status(200).send(JSON.stringify(foundUser));
                        console.log("status 200 success");
                    }
                    console.log("in crypto");
                });
            } else {
                res.status(200).send(JSON.stringify("fail"));
                console.log("status 200 nothing found");
            }
                
        });

        //mongoose.connection.close();
        //return;

    } catch (err) {
        console.log('err' + err);
        res.status(500).send(err);
    }
});

app.route("/api/logout")
    .get((req,res) => {
        // kill the session cookie, then
        res.redirect("/");
});

app.route("/api/quiz")
    .get((req,res) => {
        const jsonData = fs.readFileSync(__dirname + '/quizzes.json');
        res.send(jsonData);
});

// app.route("/api/register")
// .post(bodyParser.json(), (req, res) => {
//     User.register({ username: req.body.uname }, req.body.pass, () => {
//         try {
//             if (err) {
//                 console.log(err);
//                 res.redirect("/register");
//             } else {
//                 // authenticates and logs in the user
//                 passport.authenticate("local")(req, res, () => {
//                     alert('all is good')
//                     res.redirect("/questions");
//                 });
//             }
//         }
//         catch (error) {
//             console.log(error);
//         }
// });

// app.route("/api/login")
//     .post(bodyParser.json(), (req,res) => {
//         const user = new User ({
//             username: req.body.uname,
//             password: req.body.pass
//         });
        
//         req.login(user, (err) => {
//             if (err) {
//                 console.log(err);
//             } else {
//                 passport.authenticate("local")(req, res, () => {
//                     res.redirect("/questions");
//                 });
//             }
//         });
// });

// app.route("/api/logout")
//     .get((req,res) => {
//         req.logout();
//         res.redirect("/");
// });


app.listen(port, () => console.log(`Server is running on port ${port}.`));
