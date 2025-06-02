// server/models/WeatherData.js
import mongoose from 'mongoose';

const weatherDataSchema = new mongoose.Schema({
  location: { // Reference to the specific saved location
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Location',
  },
  // Could also store city name/lat/lon here directly if preferred over ref
  city: {
    type: String,
    required: true,
    lowercase: true,
  },
  timestamp: { // When the data was fetched/valid
    type: Date,
    required: true,
    index: true, // Index for faster time-based queries
  },
  apiTimestamp: { // Timestamp from the API provider (dt field in OpenWeatherMap)
    type: Number,
    required: true,
  },
  data: { // The actual weather data object from the API
    temperature: Number, // in Celsius or Fahrenheit (be consistent)
    feelsLike: Number,
    minTemp: Number,
    maxTemp: Number,
    pressure: Number,
    humidity: Number,
    description: String,
    icon: String, // Weather icon code
    windSpeed: Number,
    windDeg: Number,
    clouds: Number, // Cloudiness %
    rainVolume: Number, // Rain volume for the last 1 or 3 hours (check API docs)
    sunrise: Number, // Unix timestamp
    sunset: Number, // Unix timestamp
    // Add more fields as needed from your chosen weather API
  },
  source: { // Where the data came from
      type: String,
      enum: ['api', 'cache'], // Indicate if it was a fresh API call or cache hit when logged
      default: 'api',
  }
});

// Index for efficient lookup of historical data for a location
weatherDataSchema.index({ location: 1, timestamp: -1 });
// Index for efficient lookup by city name and time (useful for alerts)
weatherDataSchema.index({ city: 1, timestamp: -1 });

const WeatherData = mongoose.model('WeatherData', weatherDataSchema);

export default WeatherData;