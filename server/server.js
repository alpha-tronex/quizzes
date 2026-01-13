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

// Serve Angular app (support multiple dev/prod layouts)
const distBrowserPath = path.join(__dirname, "../dist/browser");
const distPath = path.join(__dirname, "../dist");
const srcPath = path.join(__dirname, "../src");

if (fs.existsSync(distBrowserPath)) {
    app.use(express.static(distBrowserPath));
} else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
} else {
    // fallback to serving the source index during development
    app.use(express.static(srcPath));
}
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
    let indexFile = null;
    if (fs.existsSync(path.join(distBrowserPath, 'index.html'))) {
        indexFile = path.join(distBrowserPath, 'index.html');
    } else if (fs.existsSync(path.join(distPath, 'index.html'))) {
        indexFile = path.join(distPath, 'index.html');
    } else {
        indexFile = path.join(srcPath, 'index.html');
    }
    res.sendFile(indexFile);
});

app.route("/api/register")
    .post(async (req, res) => {
        try {
            const { uname, email, pass } = req.body || {};

            // basic validation
            const validationErrors = [];
            if (!uname || typeof uname !== 'string' || uname.trim().length < 3) {
                validationErrors.push('username must be at least 3 characters');
            } else if (!/^[A-Za-z0-9]+$/.test(uname)) {
                validationErrors.push('username may contain only letters and numbers');
            }

            if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
                validationErrors.push('invalid email address');
            }

            if (!pass || typeof pass !== 'string' || pass.length < 6) {
                validationErrors.push('password must be at least 6 characters');
            }

            if (validationErrors.length) {
                return res.status(400).json({ errors: validationErrors });
            }

            // ensure username/email uniqueness
            const existing = await User.findOne({ $or: [{ username: uname }, { email: email }] });
            if (existing) {
                return res.status(409).json({ error: 'username or email already in use' });
            }

            const hash = await bcrypt.hash(pass, saltRounds);
            const user = new User({
                username: uname,
                email: email,
                password: hash
            });
            console.log('before save');

            await user.save();

            console.log('username: ' + user.username);
            console.log('email: ' + user.email);

            console.log('after save');
            res.status(200).json('success');

        } catch (err) {
            console.log('err' + err);
            res.status(500).send(err);
        }
    })

app.route("/api/login")
    .post(async (req,res) => {
    try {
        console.log("uname: " + req.body.uname);
        console.log("pass: " + req.body.pass);
        
        const uname = req.body.uname;
        const pass = req.body.pass;

        // cannot query password field if it is encrypted
        const foundUser = await User.findOne({username: uname});
        console.log("foundUser: " + foundUser);

        if (!foundUser) {
            res.status(200).send(JSON.stringify('fail'));
            console.log("status 200 nothing found");
            return;
        }

        console.log("in if (foundUser)");
        bcrypt.compare(pass, foundUser.password, function(err, result) {
            console.log('result: ' + result);
            console.log('err: ' + err);
            if (result === true) {
                res.status(200).send(JSON.stringify('success'));
                console.log("status 200 success");
            } else {
                res.status(200).send(JSON.stringify('fail'));
            }
            console.log("in crypto");
        });

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
