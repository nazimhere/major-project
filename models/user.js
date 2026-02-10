/*const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    }
});


userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
*/

const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'username',
    passwordField: 'password',
    errorMessages: {
        MissingPasswordError: 'Password is required',
        UserExistsError: 'A user already exists with that username'
    }
});

module.exports = mongoose.model('User', userSchema);

