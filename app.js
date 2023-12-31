require("dotenv").config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")
const mongoose = require('mongoose');
const bcrypt = require("bcrypt")

const app = express();
const saltRounds = 10; 

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
    password: String,
    googleId: String,
    secret: String
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
            
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Invalid email or password.' });
            }
        } catch (err) {
            return done(err);
        }
    }
));

// Serialize and deserialize user objects
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

// passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());


app.get("/", (req, res) => {
    res.render("home");
})

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }),
)

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
});

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

app.get("/secrets", async(req, res) => {
    try {
        const foundUsers = await User.find({"secret": { $ne: null }})
        res.render("secrets", { usersWithSecret: foundUsers})
    } catch (err) {
        res.status(500).send("Faild to fectch secrets!");
    }
})

app.get("/submit", (req, res)=> {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login")
    }
})

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
})

app.post('/register', async function (req, res) {
    const { username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({
        email: username,
        password: hashedPassword
    });

    try {
        await newUser.save()
        return res.status(200).render("secrets");
    } catch (err) {
        return res.status(500).redirect("/register");
    }
});

// app.post("/register", (req, res) => {
//     User.register(new User({ username: req.body.username }), req.body.password, function (err, user) {
//         if (err) {
//             res.redirect("/register");
//             return console.log(err);
//         } else {
//             passport.authenticate("local")(req, res, function () {
//                 res.redirect("/secrets");
//             })
//         }
//     })
// })

app.post('/login', passport.authenticate('local', { failureRedirect: "/login" }), function (req, res) {
    res.status(200).redirect("/secrets");
});

// app.post("/login", (req, res) => {
//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     })

//     req.login(user, (err) => {
//         if (err) {
//             return res.send('Error logging in')
//         } else {
//             passport.authenticate("local")(req, res, function () {
//                 res.redirect("/secrets");
//             })
//         }
//     })
// });

app.post("/submit", async (req, res)=> {
    const submitedSecret = req.body.secret;

    try {
        const foundUser = await User.findById(req.user.id)
        if (foundUser) {
            foundUser.secret = submitedSecret;
            await foundUser.save();
            res.redirect("/secrets");
        } else {
            res.status(404).send("User not found");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error occurred while saving the secret");    }
})


const port = 3000 || process.env.PORT
app.listen(port, function () {
    console.log('Server is running on port 3000');
});