const session=require("express-session");
const express = require("express");
const methodOverride = require("method-override"); 
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const ejsMate = require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const Review = require("./models/review.js");
const User =require("./models/user.js");
const app = express();
const cookieParser = require('cookie-parser');
const passport=require("passport");
const LocalStrategy=require("passport-local");
const flash=require("connect-flash");
app.use(cookieParser());

const MONGO_URL = "mongodb://127.0.0.1:27017/travel_in";

/// ✅ CORRECT ORDER - Replace your entire middleware section
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));


// SESSION FIRST - before passport
const sessionOptions = {
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
        secure: false  // ← LOCALHOST FIX
    }
};
app.use(session(sessionOptions));
app.use(flash());

// Passport AFTER session
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());  


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Flash middleware AFTER passport
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    next();
});

app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));
//  LINE 35-41: WORKING DEMO USER 
app.get("/demouser", (req, res) => {
    res.send(`
        <h2>Demo User Credentials</h2>
        <p><strong>Username:</strong> Apha</p>
        <p><strong>Password:</strong> hellopass123</p>
        <p><a href="/login" class="btn btn-primary">Go to Login</a></p>
        <script>
            // Auto-redirect to login
            setTimeout(() => window.location.href = '/login', 2000);
        </script>
    `);
});
// ✅ ROUTES (CORRECT ORDER - Specific first!)
app.get("/", (req, res) => {
    res.redirect("/listings");
});

const requireLogin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'Must be signed in!');
        return res.redirect('/login');
    }
    next();
};



// INDEX
app.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("index", { allListings });
});
//new 
app.get('/listings/new', requireLogin, (req, res) => {
    res.render('new');
});

// SHOW
app.get('/listings/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate('reviews');
    if (!listing) {
        return res.status(404).render("error", { error: "Listing not found" });
    }
    res.render("show", { listing });
}));
// ✅ EDIT form (MISSING BEFORE!)
app.get("/listings/:id/edit", requireLogin, async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        return res.status(404).render("error", { error: "Listing not found" });
    }
    res.render("edit", { listing });
});

// CREATE
// ✅  CREATE ROUTE (after new route)
app.post("/listings", requireLogin, wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;  // Link to user
    await newListing.save();
    req.flash("success", "New listing created!");
    res.redirect("/listings");
}));


// UPDATE (REMOVED DUPLICATE)
// UPDATE Route
app.put("/listings/:id", requireLogin, async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { 
        new: true, 
        runValidators: true 
    });
    res.redirect(`/listings/${id}`);
});
// DELETE
app.delete("/listings/:id", requireLogin, async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted!");
    res.redirect("/listings");
});
//review route

// ✅ SHOW ROUTE - Displays listing WITH populated reviews
/*app.get('/listings/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate('reviews');
    if (!listing) {
        return res.status(404).render("error", { error: "Listing not found" });
    }
    res.render('listings/show', { listing });  // ✅ Correct path
}));*/

// ✅ CREATE REVIEW ROUTE - FIXED ORDER
app.post("/listings/:id/reviews", requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const newReview = new Review(req.body.review);
        newReview.author = req.user._id;  // 👈 ADD AUTHOR
        await newReview.save();
        
        const listing = await Listing.findById(id).populate("reviews");
        listing.reviews.push(newReview._id);
        await listing.save();
        
        req.flash("success", "Review added!");
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
//cookies
app.get("/getcookies",(req,res)=>{
    res.cookie("greet","aasalam-o-aalekum");
    res.send("sent cookies!");
});
app.get("/readcookies", (req, res) => {
    const greeting = req.cookies.greet;
    res.send(`Your greeting: ${greeting || 'No cookie found'}`);
});

///signup 
app.get("/signup", (req, res) => {
    res.render("users/signup");
});

app.get("/login", (req, res) => {
    res.render("users/login");
});

// ✅ YOUR SIGNUP (keep as-is)
app.post("/signup", (req, res, next) => {
    const { username, email, password } = req.body;
    const newUser = new User({ username, email });
    
    User.register(newUser, password, (err, registeredUser) => {
        if (err) {
            console.error("Signup error:", err);
            req.flash("error", err.message);
            return res.redirect("/signup");
        }
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome aboard!");
            res.redirect("/listings");
        });
    });
});

// ✅ ADD THIS LOGIN ROUTE
app.post("/login", 
    passport.authenticate('local', { 
        failureRedirect: '/login', 
        failureFlash: true 
    }), 
    (req, res) => {
        req.flash('success', 'Welcome back!');
        res.redirect('/listings');
    }
);

app.get("/logout",(req, res, next)=> {
    req.logout((err)=> {
        if (err) {
            return next(err);}
        req.flash('success', 'See you later!');
        res.redirect("/listings");
    });
});

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