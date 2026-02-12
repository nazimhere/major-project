const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: String,
  password: { type: String, required: true }
});

// ✅ FIXED: Modern async Mongoose middleware (NO 'next' parameter)
userSchema.pre('save', async function() {  // ← NO 'next' parameter
  if (!this.isModified('password')) return;  // ← NO next()
  this.password = await bcrypt.hash(this.password, 12);  // ← Pure async
});

module.exports = mongoose.model('User', userSchema);
