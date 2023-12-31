require("dotenv").config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")
const mongoose = require('mongoose');

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SEC,
    saveUninitialized: false,
    resave: false
}))

mongoose.connect(process.env.MONGO_STRING);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

app.use(passport.initialize());
app.use(passport.session());

// Configure Passport.js to use passport-local strategy
passport.use(new LocalStrategy(
    async function (username, password, done) {
        try {
            const user = await User.findOne({ email: username })
            if (!user) {
                return done(null, false, { message: 'Invalid email or password.' });
            }
            if (user.password !== password) {
                return done(null, false, { message: 'Invalid email or password.' });
            }
            return done(null, user);
        } catch (err) {
            console.log(err);
            return done(err);
        }
    }
));

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

// Serialize and deserialize user objects
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
    try {
        const user = User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});


app.get("/", (req, res) => {
    res.render("home");
})

app.get("/register", (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/secrets");
    } else {
        res.render("register")
    }
})

app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/secrets");
    } else {
        res.render("login")
    }
})

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login")
    }
})

app.get("/logout", (req, res) => {
    // logout function come from passportJS
    req.logOut(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    })
})


app.post('/register', async function (req, res) {
    const { username, password } = req.body;

    const newUser = new User({
        email: username,
        password: password
    });

    try {
        await newUser.save()
        return res.status(200).render("secrets");
    } catch (err) {
        return res.status(500).redirect("/register");
    }
});

app.post('/login', passport.authenticate('local', { failureRedirect: "/login" }), function (req, res) {
    // If this function gets called, authentication was successful
    // `req.user` contains the authenticated user

    res.status(200).render("secrets");
});

app.use((req, res) => {
    res.status(404).render("notfound");
})

app.listen(3000, function () {
    console.log('Server is running on port 3000');
});

