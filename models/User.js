const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  line1: { type: String, required: true },
  line2: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  isPrimary: { type: Boolean, default: false }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, default: 'User', trim: true },
  email: { type: String, lowercase: true, trim: true, sparse: true, index: true },
  phone: { type: String, trim: true, sparse: true, index: true },
  countryCode: { type: String, default: '+91' },
  googleId: { type: String, sparse: true, index: true },
  firebaseUid: { type: String, sparse: true, index: true },
  avatar: { type: String, default: '' },
  otp: { type: String },
  otpExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
  authProvider: { type: String, enum: ['phone', 'google', 'email', 'firebase'], default: 'phone' },
  addresses: { 
    type: [addressSchema], 
    validate: [v => v.length <= 10, 'Maximum 10 addresses allowed'] 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
