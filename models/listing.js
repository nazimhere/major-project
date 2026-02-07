const mongoose = require("mongoose");
const Schema = mongoose.Schema; 


const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        type: String,
        required: true  // Simple & clean
    },
    price: Number,
    location: String,
    country: String,
    reviews:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Review"
    }]
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;