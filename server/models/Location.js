// server/models/Location.js
import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Reference to the User model
  },
  name: { // e.g., "London", "New York Home"
    type: String,
    required: true,
    trim: true,
  },
  city: { // The city name used for API lookups if lat/lon not primary
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  // Optional but recommended for accuracy
  latitude: {
    type: Number,
    // required: true,
  },
  longitude: {
    type: Number,
    // required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user cannot save the exact same city twice
locationSchema.index({ user: 1, city: 1 }, { unique: true });

const Location = mongoose.model('Location', locationSchema);

export default Location;