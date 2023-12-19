require("dotenv").config()
const express = require('express');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_STRING);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
})

userSchema.plugin(encrypt, {
    secret: process.env.SEC_KEY,
    encryptedFields: ["password"]
});

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    })

    newUser.save()
        .then((result) => {
            console.log(result);
            res.render("secrets")
        })
        .catch((err) => {
            console.log(err);
        })
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/login", (req, res) => {
    let username = req.body.username;
    let password = req.body.password;


    User.findOne({ email: username })
        .then((result) => {
            if (result) {
                if (result.password == password) {
                    console.log(result);
                    res.render("secrets")
                } else {
                    console.log("Icorrect Password!");
                }
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