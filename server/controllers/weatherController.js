// server/controllers/weatherController.js
import asyncHandler from 'express-async-handler';
import Location from '../models/Location.js';
import { getCurrentWeatherByCity, getHistoricalWeatherData } from '../services/weatherService.js';
import WeatherData from '../models/WeatherData.js'; // Needed for direct history query if service changes

// @desc    Get current weather for a city (can be used by anyone)
// @route   GET /api/weather/current?city=London
// @access  Public (or protect if you only want logged-in users)
const getCurrentWeather = asyncHandler(async (req, res) => {
  const { city } = req.query;

  if (!city) {
    res.status(400);
    throw new Error('City parameter is required');
  }

  // We don't necessarily have a saved Location._id here, so we won't link persistence
  const weather = await getCurrentWeatherByCity(city);
  res.json(weather);
});

// @desc    Add a location to the user's saved list
// @route   POST /api/weather/locations
// @access  Private
const addLocation = asyncHandler(async (req, res) => {
  const { city, name } = req.body; // 'name' is user's label, 'city' is for API lookup

  if (!city || !name) {
    res.status(400);
    throw new Error('City and Name are required');
  }

  // Optional: Validate if city exists using a quick weather API check before saving
  // This adds an extra API call but prevents saving invalid cities.
  try {
      await getCurrentWeatherByCity(city); // Check if API recognizes the city
  } catch (error) {
      if (error.message.includes('City not found')) {
          res.status(404); // Not Found
          throw new Error(`Cannot save location: City "${city}" not found by weather service.`);
      } else {
          // Rethrow other errors (e.g., API down)
          throw error;
      }
  }

  // Check if the user has already saved this city
  const existingLocation = await Location.findOne({ user: req.user._id, city: city.toLowerCase() });
  if (existingLocation) {
    res.status(400);
    throw new Error(`Location "${city}" already saved.`);
  }

  const location = new Location({
    user: req.user._id,
    name: name,
    city: city.toLowerCase(), // Store city consistently
    // Lat/Lon could be fetched from the weather API response if needed
  });

  const createdLocation = await location.save();

  // Fetch and persist weather immediately after saving (optional, but good for initial data)
  // Pass the newly created document to link persistence
  try {
      await getCurrentWeatherByCity(createdLocation.city, createdLocation);
  } catch(weatherError) {
      console.warn(`Saved location ${city}, but failed initial weather fetch/persist: ${weatherError.message}`)
      // Don't fail the location save if the immediate weather fetch fails
  }


  res.status(201).json(createdLocation);
});

// @desc    Get user's saved locations
// @route   GET /api/weather/locations
// @access  Private
const getSavedLocations = asyncHandler(async (req, res) => {
  const locations = await Location.find({ user: req.user._id }).sort({ createdAt: 'desc' });
  res.json(locations);
});

// @desc    Delete a saved location
// @route   DELETE /api/weather/locations/:id
// @access  Private
const deleteLocation = asyncHandler(async (req, res) => {
    const location = await Location.findById(req.params.id);

    if (!location) {
        res.status(404);
        throw new Error('Location not found');
    }

    // Ensure the location belongs to the logged-in user
    if (location.user.toString() !== req.user._id.toString()) {
        res.status(401); // Unauthorized
        throw new Error('User not authorized to delete this location');
    }

    // Optional: Delete associated WeatherData and Alerts before deleting location
    // await WeatherData.deleteMany({ location: location._id });
    // await Alert.deleteMany({ location: location._id });

    await location.remove(); // Use remove() or deleteOne() based on Mongoose version

    res.json({ message: 'Location removed successfully', id: req.params.id });
});


// @desc    Get historical weather data for a saved location
// @route   GET /api/weather/history/:locationId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Private
const getHistory = asyncHandler(async (req, res) => {
    const { locationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!locationId || !startDate || !endDate) {
        res.status(400);
        throw new Error('Location ID, start date, and end date are required');
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Set end date to the end of the day for inclusive query
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400);
        throw new Error('Invalid date format. Please use YYYY-MM-DD.');
    }

    // Verify the location belongs to the user
    const location = await Location.findOne({ _id: locationId, user: req.user._id });
    if (!location) {
        res.status(404);
        throw new Error('Saved location not found or access denied.');
    }

    // Fetch history using the service
    const historyData = await getHistoricalWeatherData(locationId, start, end);

    res.json(historyData);
});


export {
  getCurrentWeather,
  addLocation,
  getSavedLocations,
  deleteLocation,
  getHistory,
};