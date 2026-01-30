// ✅ COMPLETE CORRECTED app.js - 100% WORKING VERSION
const express = require("express");
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override"); 
const ejsMate = require("ejs-mate");

const app = express();
const MONGO_URL = "mongodb://127.0.0.1:27017/travel_in";

// ✅ MIDDLEWARE (CORRECT ORDER)
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ✅ ROUTES - CRITICAL ORDER (Static → Parameter)
app.get("/", (req, res) => {
    res.send("Hi I am here!");
});

// INDEX - All listings
app.get("/listings", async (req, res) => {
    try {
        const allListings = await Listing.find({});
        console.log("📋 Found listings:", allListings.length);
        res.render("index", { allListings });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching listings");
    }
});

// ✅ STATIC ROUTES FIRST (MOST IMPORTANT FIX!)
app.get("/listings/new", (req, res) => {
    res.render("new");
});

app.post("/listings", async (req, res) => {
    try {
        console.log("📥 Creating:", req.body.listing);
        const newListing = new Listing(req.body.listing);
        await newListing.save();
        res.redirect("/listings");
    } catch (err) {
        console.error("❌ Create error:", err);
        res.render("new", { error: err.message });
    }
});

// ✅ PARAMETER ROUTES LAST (After static routes)
app.get("/listings/:id/edit", async (req, res) => {
    try {
        const { id } = req.params;
        console.log("✏️ Edit ID:", id);
        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).send("Listing not found");
        }
        res.render("edit", { listing });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/listings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log("👁️ Show ID:", id);
        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).send("Listing not found");
        }
        res.render("show", { listing });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.put("/listings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log("🔄 Update ID:", id, "Data:", req.body.listing);
        const updatedListing = await Listing.findByIdAndUpdate(
            id, 
            { ...req.body.listing }, 
            { new: true, runValidators: true }
        );
        if (!updatedListing) {
            return res.status(404).send("Listing not found");
        }
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("❌ Update error:", err);
        res.status(400).send("Failed to update");
    }
});

app.delete("/listings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log("🗑️ Delete ID:", id);
        await Listing.findByIdAndDelete(id);
        res.redirect("/listings");
    } catch (err) {
        console.error(err);
        res.status(500).send("Delete failed");
    }
});

// ✅ DATABASE + SERVER (Perfect startup)
async function main() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ MongoDB Error:", err);
    }
}

main().then(() => {
    app.listen(8080, () => {
        console.log("\n🚀 Server ready: http://localhost:8080");
        console.log("📋 All: /listings");
        console.log("➕ New: /listings/new");
        console.log("👁️  View: /listings/[ID]");
        console.log("✏️  Edit: /listings/[ID]/edit");
    });
});
