const Listing = require("../models/listing");

module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return res.status(404).render("error", { error: "Listing not found" });
  }

  if (!req.user || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You do not have permission to edit this listing");
    return res.redirect(`/listings/${id}`);
  }

  res.locals.listing = listing;  // pass to the controller if needed
  next();
};

module.exports.isReviewAuthor=async(req,res,next)=>{
let {id,reviewId}=req.params;
let review=await Review.findById(reviewId);
if(!review.owner.equals(res.locals.currUser._id)){
  res.flash("error","not have no permission to edit the review");
  return res.redirect('/listings/${id}');
}
};