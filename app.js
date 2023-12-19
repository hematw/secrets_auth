require("dotenv").config()
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_STRING);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
})


const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, (err, result) => {
        const newUser = new User({
            email: req.body.username,
            password: result
        });
        if (!err) {
            newUser.save()
                .then((result) => {
                    console.log(result);
                    res.render("secrets")
                })
                .catch((err) => {
                    console.log(err);
                })
        }
    })
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/login", (req, res) => {
    let username = req.body.username;


    User.findOne({ email: username })
        .then((foundUser) => {
            if (foundUser !== null) {
                console.log(bcrypt.getRounds(foundUser.password));
                bcrypt.compare(req.body.password, foundUser.password, (err, result) => {
                    if (result) {
                        res.render("secrets")
                    } else {
                        console.log("Incorrect Password");
                    }
                })
            } else {
                console.log("We couldn't found any user!");
            }
        })
        .catch((err) => {
            console.log(err);
        })
})


app.listen(3000, () => {
    console.log("Server Started in port 3000 🚀");
})