const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js"); // Single import

const MONGO_URL = "mongodb://127.0.0.1:27017/travel_in";

async function initDB() {
    try {
        await Listing.deleteMany({});
        
        // Fix BOTH image AND owner
        initData.data = initData.data.map((obj) => ({
            ...obj,
            owner: "698ade0e5e1f29684973cfef", // Fixed
            image: obj.image.url || obj.image // Extract URL from object
        }));
        
        await Listing.insertMany(initData.data);
        console.log("✅ Data initialized successfully!");
    } catch (err) {
        console.error("❌ Init error:", err);
    }
}


async function main() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to DB");
        await initDB(); // Run AFTER connection
    } catch (err) {
        console.error("❌ Connection error:", err);
    } finally {
        mongoose.connection.close(); // Clean up
    }
}

main();
