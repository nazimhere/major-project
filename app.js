require('dotenv').config();
const Booking = require('./models/booking');


const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_in';

// CONNECT ONCE, IMMEDIATELY
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
connectDB();

const express = require("express");
const wrapAsync = require("./utils/wrapAsync.js");
const session = require("express-session");
// Replace your MongoStore import with:

const methodOverride = require("method-override");
const Listing = require("./models/listing.js");
const path = require("path");
const ejsMate = require("ejs-mate");
const Review = require("./models/review.js");
const User = require("./models/user.js");
const cookieParser = require('cookie-parser');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");

require('./models/user');
require('./models/listing');
require('./models/review');  // ADD THIS
const { isOwner, isReviewAuthor } = require("./middleware/auth");

const app = express();

app.use(cookieParser());
///  const MONGO_URL = "mongodb://127.0.0.1:27017/travel_in";

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// DELETE ALL THIS and replace with below 👇

// 1. URLENCODED + JSON PARSERS FIRST (CRITICAL)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());




// 2. PASSPORT STRATEGY (before session)
passport.use(new LocalStrategy({ 
  usernameField: 'username',
  passwordField: 'password'
}, async (username, password, done) => {
  console.log('🔐 LOGIN CALLED:', username || 'NULL', password ? 'YES' : 'NO');
  
  if (!username || !password) {
    console.log('❌ MISSING username/password');
    return done(null, false, { message: 'Missing credentials' });
  }
  
  try {
    const bcrypt = require('bcryptjs');
    const user = await User.findOne({ 
      $or: [{ email: username }, { username: username }]
    });
    
    console.log('👤 User:', !!user);
    
    if (!user) {
      console.log('❌ No user');
      return done(null, false);
    }
    
    const match = await bcrypt.compare(password, user.password);
    console.log('🔑 Match:', match);
    
    return match ? done(null, user) : done(null, false);
  } catch (err) {
    console.error('💥 Error:', err);
    done(err);
  }
}));


passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use(session({
  secret: process.env.SESSION_SECRET || "mysupersecretcode",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7  // 7 days
  }
}));


app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// 4. FLASH LOCALS LAST
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});

app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/demouser", (req, res) => {
  res.send(`
    <h2>Demo User Credentials</h2>
    <p><strong>Username:</strong> Apha</p>
    <p><strong>Password:</strong> hellopass123</p>
    <p><a href="/login">Go to Login</a></p>
  `);
});

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
// ADD THIS MIDDLEWARE - RIGHT AFTER requireLogin
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please login to book this place!');
  res.redirect('/login');
};


app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("index", { allListings });
});

// FIXED NEW LISTING ROUTE
app.get('/listings/new', requireLogin, (req, res) => {
  res.render('new', { 
    title: 'Add New Listing',
    listing: null  // ✅ Pass null to prevent undefined error
  });
});


app.get('/listings/:id', wrapAsync(async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
  .populate( 'reviews'
  )
  .populate('owner');
  if (!listing) {
    return res.status(404).render("error", { error: "Listing not found" });
  }
  console.log(listing);
  res.render("show", { listing });
}));

app.get("/listings/:id/edit", requireLogin,isOwner, async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    return res.status(404).render("error", { error: "Listing not found" });
  }
  res.render("edit", { listing });
});

app.post("/listings", requireLogin, wrapAsync(async (req, res) => {
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  await newListing.save();
  req.flash("success", "New listing created!");
  res.redirect("/listings");
}));

app.put("/listings/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { 
    new: true, 
    runValidators: true 
  });
  res.redirect(`/listings/${id}`);
});

app.delete("/listings/:id", requireLogin,isOwner, async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted!");
  res.redirect("/listings");
});

app.post("/listings/:id/reviews", requireLogin, async (req, res) => {
  const { id } = req.params;
  const newReview = new Review(req.body.review);
  newReview.author = req.user._id;
  await newReview.save();
  
  const listing = await Listing.findById(id);
  listing.reviews.push(newReview._id);
  await listing.save();
  
  req.flash("success", "Review added!");
  res.redirect(`/listings/${listing._id}`);
});

app.delete("/listings/:id/reviews/:reviewId",isOwner,requireLogin,isReviewAuthor, wrapAsync(async (req, res) => {
  let { id, reviewId } = req.params;
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  res.redirect(`/listings/${id}`);
}));

app.get("/getcookies", (req, res) => {
  res.cookie("greet", "aasalam-o-aalekum");
  res.send("sent cookies!");
});

app.get("/readcookies", (req, res) => {
  const greeting = req.cookies.greet;
  res.send(`Your greeting: ${greeting || 'No cookie found'}`);
});


app.post('/signup', async (req, res) => {
  console.log('🔍 SIGNUP FORM DATA RECEIVED:', req.body);
  
  try {
    const { email, password, username } = req.body;
    
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password?.length);
    console.log('👤 Username:', username);
    
    if (!email || !password) {
      console.log('❌ Missing email/password');
      req.flash('error', 'Email and password are required!');
      return res.redirect('/signup');
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    console.log('🔍 Existing user found:', !!existingUser);
    
    if (existingUser) {
      console.log('❌ User already exists');
      req.flash('error', 'User with that email already exists!');
      return res.redirect('/signup');
    }

    // Create new user
    console.log('✅ Creating new user...');
    const user = new User({ 
      email: email.trim().toLowerCase(),
      password, 
      username: username || 'Anonymous'
    });

    // CANCEL BOOKING ROUTE - MUST EXIST
app.delete('/bookings/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ 
      _id: id, 
      author: req.user._id 
    });
    
    if (!booking) {
      req.flash('error', 'Booking not found!');
      return res.redirect('/bookings');
    }
    
    await Booking.findByIdAndDelete(id);
    req.flash('success', `✅ Booking cancelled successfully!`);
    res.redirect('/bookings');
  } catch (err) {
    console.error('❌ Cancel error:', err);
    req.flash('error', 'Error cancelling booking!');
    res.redirect('/bookings');
  }
});

    
    await user.save();
    console.log('🎉 USER CREATED SUCCESSFULLY:', user._id);
    
    req.flash('success', 'Account created successfully! Please login.');
    res.redirect('/login');
    
  } catch (err) {
    console.error('💥 SIGNUP ERROR:', err);
    req.flash('error', 'Signup failed: ' + err.message);
    res.redirect('/signup');
  }
});


// BOOKING ROUTES - Add these to your app.js
// BOOKING ROUTES - CLEAN SINGLE VERSION
app.get('/bookings/new/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash('error', 'Listing not found!');
      return res.redirect('/listings');
    }
    res.render('bookings/new', { listing, title: 'Book This Place' });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server error!');
    res.redirect('/listings');
  }
});

app.post('/bookings/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, guests } = req.body;
    
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash('error', 'Listing not found!');
      return res.redirect('/listings');
    }

    // ✅ PREVENT DOUBLE BOOKING
    const existingBooking = await Booking.findOne({
      listing: id,
      author: req.user._id,
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ]
    });

    if (existingBooking) {
      req.flash('error', '❌ You already have a booking for these dates!');
      return res.redirect(`/listings/${id}`);
    }

    const newBooking = new Booking({
      listing: id,
      author: req.user._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      guests: Number(guests)
    });

    await newBooking.save();
    req.flash('success', `🎉 Booking Confirmed! Dates: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()} | Guests: ${guests}`);
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error creating booking!');
    res.redirect(`/listings/${id}`);
  }
});

// MY BOOKINGS - Show user's bookings
app.get('/bookings', isLoggedIn, async (req, res) => {
  try {
    const bookings = await Booking.find({ author: req.user._id })
      .populate('listing')
      .sort({ startDate: -1 });
    
    res.render('bookings/index', { 
      bookings, 
      title: 'My Bookings' 
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading bookings!');
    res.redirect('/listings');
  }
});



//middleware for authorization
module.exports.isOwner=async(req,res,next)=>{
let {id}=req.params;
let listing=await Listing.findById(id);
if(!listing.owner.equals(res.locals.currUser._id)){
  res.flash("error","not have no permission to edit");
  return res.redirect('/listings/${id}');
}
};
// middleware for review owner
module.exports.isReviewAuthor=async(req,res,next)=>{
let {id,reviewId}=req.params;
let review=await Review.findById(reviewId);
if(!review.owner.equals(res.locals.currUser._id)){
  res.flash("error","not have no permission to edit the review");
  return res.redirect('/listings/${id}');
}
};

app.get("/signup", (req, res) => {
  res.render("users/signup");
});

// ADD THIS DEBUG ROUTE (temporarily)
app.post('/debug-login', (req, res) => {
  console.log('🔍 DEBUG LOGIN FORM DATA:', req.body);
  res.json({ received: req.body });
});


app.get("/login", (req, res) => {
  res.render("users/login");
});

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

app.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'See you later!');
    res.redirect("/listings");
  });
});

app.use((req, res) => {
  res.status(404).render("error", { error: "Page not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", { error: "Server error" });
});
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Server on http://localhost:${port}`);
});
