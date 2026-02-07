const express = require("express");
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override"); 
const ejsMate = require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const Review = require("./models/review.js");
const review = require("./models/review.js");


const app = express();
const MONGO_URL = "mongodb://127.0.0.1:27017/travel_in";


// ✅ MIDDLEWARE (FIXED ORDER)
app.engine("ejs", ejsMate);      // 1. FIRST
app.set("view engine", "ejs");   // 2. THEN
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));


// ✅ ROUTES (CORRECT ORDER - Specific first!)
app.get("/", (req, res) => {
    res.redirect("/listings");
});


// INDEX
app.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("index", { allListings });
});


// NEW form
app.get("/listings/new", (req, res) => {
    res.render("new");
});


// SHOW
app.get("/listings/:id", async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        return res.status(404).render("error", { error: "Listing not found" });
    }
    res.render("show", { listing });
});


// ✅ EDIT form (MISSING BEFORE!)
app.get("/listings/:id/edit", async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        return res.status(404).render("error", { error: "Listing not found" });
    }
    res.render("edit", { listing });
});


// CREATE
app.post("/listings", wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");
})
);


// UPDATE (REMOVED DUPLICATE)
// UPDATE Route
app.put("/listings/:id", async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { 
        new: true, 
        runValidators: true 
    });
    
    // FIX: Change "/listing" to "/listings"
    res.redirect(`/listings/${id}`);
});


// DELETE
app.delete("/listings/:id", async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
});



//review route


// ✅ SHOW ROUTE - Displays listing WITH populated reviews
app.get('/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id).populate('reviews');
        res.render('listings/show', { listing });
    } catch (err) {
        console.error(err);
        res.redirect('/listings');
    }
});


// ✅ CREATE REVIEW ROUTE - FIXED ORDER
app.post("/listings/:id/reviews", async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Create & SAVE review first
        const newReview = new Review(req.body.review);
        await newReview.save();
        
        // 2. Add review _id to listing
        const listing = await Listing.findById(id).populate("reviews");
        listing.reviews.push(newReview._id);
        await listing.save();
        
        res.redirect(`/listings/${listing._id}`);
    } catch (err) {
        console.error(err);
        res.redirect('/listings');
    }
});


//review delete route
app.delete(
    "/listings/:id/reviews/:reviewId",wrapAsync(async (req,res)=>{
        let{id,reviewId}=req.params;


        await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
        await Review.findByIdAndDelete(reviewId);


        res.redirect(`/listings/${id}`);
    })
);


// 404 handler
app.use((req, res) => {
    res.status(404).render("error", { error: "Page not found" });
});


// ERROR handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render("error", { error: "Server error" });
});


// ✅ FIXED DB CONNECTION
async function main() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
    }
}
const port = 8080;
app.listen(port, () => {
    console.log(`🚀 Server on http://localhost:${port}`);
    main(); // Connect DB after server starts
});