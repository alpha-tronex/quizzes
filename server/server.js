require("dotenv").config();
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const fs = require('fs');
const authRoutes = require(`${__dirname}/authRoutes.js`);
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
            selection: [Number],
            correct: [Number],
            isCorrect: Boolean
        }],
        score: Number,
        totalQuestions: Number
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

mongoose.connect("mongodb://localhost:27017/userDB");

// Setup authentication routes
authRoutes(app, User);

app.get("/api/quizzes", (req, res) => {
    console.log('loading available quizzes');
    const quizzesDir = __dirname + '/quizzes';
    const quizFiles = fs.readdirSync(quizzesDir).filter(file => file.endsWith('.json'));
    
    const quizzes = quizFiles.map(file => {
        const data = JSON.parse(fs.readFileSync(`${quizzesDir}/${file}`, 'utf8'));
        return {
            id: data.id,
            title: data.title
        };
    });
    
    res.json(quizzes);
});

app.route("/api/quiz")
    .get((req,res) => {
        console.log('loading quiz data');
        const quizId = req.query.id || 0;
        const jsonData = fs.readFileSync(__dirname + `/quizzes/quiz_${quizId}.json`);
        res.send(jsonData);
    })
    .post(bodyParser.json(), async (req, res) => {
        try {
            const { username, quizData } = req.body;
            
            if (!username || !quizData) {
                return res.status(400).json({ error: 'Username and quiz data are required' });
            }
            
            const user = await User.findOne({ username: username });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Add the completed quiz to user's quizzes array
            user.quizzes.push(quizData);
            await user.save();
            
            console.log('Quiz saved for user:', username);
            res.status(200).json({ message: 'Quiz saved successfully', quiz: quizData });
        } catch (error) {
            console.error('Error saving quiz:', error);
            res.status(500).json({ error: 'Failed to save quiz' });
        }
    });

app.get("/api/quiz/history/:username", async (req, res) => {
    try {
        const username = req.params.username;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('Quiz history retrieved for user:', username);
        res.status(200).json({ quizzes: user.quizzes || [] });
    } catch (error) {
        console.error('Error retrieving quiz history:', error);
        res.status(500).json({ error: 'Failed to retrieve quiz history' });
    }
});

// Serve Angular app for any other GET request (must be after API routes)
app.get("*", (req, res) => {
    // If the request is for API, skip (shouldn't happen because APIs are defined above)
    if (req.path && req.path.startsWith('/api/')) {
        return res.status(404).send('Not Found');
    }
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
