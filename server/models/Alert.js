// server/models/Alert.js
import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  location: { // Reference to the saved location
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Location',
  },
  city: { // Store city name for easier lookup during cron job
    type: String,
    required: true,
    lowercase: true,
  },
  condition: { // What weather metric to check
    type: String,
    required: true,
    enum: [ // Examples, customize based on available WeatherData.data fields
      'temp_gt',    // Temperature greater than
      'temp_lt',    // Temperature less than
      'humidity_gt',// Humidity greater than
      'wind_gt',    // Wind speed greater than
      'rain_likely',// Chance of rain (might need specific API field check)
      'desc_contains'// Description contains text (e.g., 'snow')
    ],
  },
  threshold: { // The value to compare against (Number or String for desc_contains)
    type: mongoose.Schema.Types.Mixed, // Allows Number or String
    required: true,
  },
  isEnabled: { // Allow users to temporarily disable alerts
    type: Boolean,
    default: true,
  },
  lastNotified: { // Timestamp of the last notification sent for this alert
    type: Date,
    default: null,
  },
  // Optional: Cooldown period (e.g., don't notify again for X hours)
  // cooldownHours: { type: Number, default: 6 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for finding active alerts for a user/location
alertSchema.index({ user: 1, location: 1 });
// Index for finding all active alerts during cron job
alertSchema.index({ isEnabled: 1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;