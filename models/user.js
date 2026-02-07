const mongoose = require("mongoose");
const Schema = mongoose.Schema; 

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
});

// ✅ This works with Node 24 + latest Mongoose
//userSchema.plugin(require('passport-local-mongoose'));

module.exports = mongoose.model("User", userSchema);  // Capital "U"

