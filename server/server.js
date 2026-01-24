require("dotenv").config();
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require('fs');
const authRoutes = require(`${__dirname}/routes/authRoutes.js`);
const quizRoutes = require(`${__dirname}/routes/quizRoutes.js`);
const adminRoutes = require(`${__dirname}/routes/adminRoutes.js`);
const utilRoutes = require(`${__dirname}/routes/utilRoutes.js`);
const quizUploadRoutes = require(`${__dirname}/routes/quizUploadRoutes.js`);
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
const port = process.env.PORT || 3000;

// filepath: c:\Projects\NODEJS\quizzes\server\server.js
const path = require("path");
const { type } = require("os"); //his function returns a string representing the operating system name (e.g., 'Linux', 'Darwin' for macOS,

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
    fname: String,
    lname: String,
    username: String,
    email: String,
    password: String,
    phone: String,
    address: {
        street1: String,
        street2: String,
        street3: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    type: String,
    quizzes: [{
        id: Number,
        title: String,
        completedAt: Date,
        questions: [{
            questionNum: Number,
            question: String,
            answers: [String],
            selection: [Number],
            correct: [Number],
            isCorrect: Boolean
        }],
        score: Number,
        totalQuestions: Number,
        duration: Number
    }]
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

const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/userDB";
mongoose.connect(mongoURI);

// Setup authentication routes
authRoutes(app, User);

// Setup quiz routes
quizRoutes(app, User);

// Setup admin routes
adminRoutes(app, User);

// Setup utility routes
utilRoutes(app);

// Setup quiz upload routes
quizUploadRoutes(app);

// Serve Angular app for any other GET request (must be after API routes)
app.use((req, res, next) => {
    // If the request is for API, skip
    if (req.path && req.path.startsWith('/api/')) {
        return next();
    }
    
    let indexFile = null;
    if (fs.existsSync(path.join(distBrowserPath, 'index.html'))) {
        indexFile = path.join(distBrowserPath, 'index.html');
    } else if (fs.existsSync(path.join(distPath, 'index.html'))) {
        indexFile = path.join(distPath, 'index.html');
    } else {
        indexFile = path.join(srcPath, 'index.html');
    }
    
    // Set cache control headers for Safari compatibility
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(indexFile);
});

app.listen(port, () => console.log(`Server is running on port ${port}.`));
