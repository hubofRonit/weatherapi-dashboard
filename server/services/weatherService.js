// server/services/weatherService.js
import axios from 'axios';
import NodeCache from 'node-cache';
import config from '../config/index.js';
import WeatherData from '../models/WeatherData.js'; // Import model for persistence

// Initialize Cache
// stdTTL: default time-to-live in seconds for every new entry
// checkperiod: interval in seconds to check for expired entries
const cache = new NodeCache({ stdTTL: config.cacheTtl, checkperiod: config.cacheTtl * 0.2 });

const weatherApi = axios.create({
  baseURL: config.weatherApiBaseUrl,
  params: {
    appid: config.weatherApiKey,
    units: 'metric', // Or 'imperial' for Fahrenheit
  },
});

/**
 * Fetches current weather data for a given city.
 * Implements caching and persistence.
 * @param {string} city - The name of the city.
 * @param {object} locationDoc - The mongoose Location document (optional, for persistence link).
 * @returns {Promise<object>} - The weather data object.
 */
const getCurrentWeatherByCity = async (city, locationDoc = null) => {
  const cacheKey = `weather_${city.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    console.log(`Cache hit for: ${city}`);
    // Optionally persist cache hits if needed for analysis, but usually we persist only fresh data
    // await persistWeatherData(city, cachedData, locationDoc, 'cache');
    return cachedData;
  }

  console.log(`Cache miss for: ${city}. Fetching from API.`);
  try {
    const response = await weatherApi.get('/weather', {
      params: { q: city },
    });

    const weatherData = mapWeatherData(response.data); // Map API response to our desired format

    // Set data in cache
    cache.set(cacheKey, weatherData);

    // Persist the fresh data
    await persistWeatherData(city, weatherData, locationDoc, 'api');

    return weatherData;
  } catch (error) {
    console.error(`Error fetching weather for ${city}:`, error.response ? error.response.data : error.message);
    // Handle specific errors like city not found (404)
    if (error.response && error.response.status === 404) {
        throw new Error(`City not found: ${city}`);
    }
    throw new Error(`Could not fetch weather data for ${city}`);
  }
};

// Helper function to map OpenWeatherMap data to our WeatherData model structure
// Adapt this based on your chosen API and WeatherData model fields
const mapWeatherData = (apiData) => {
    if (!apiData || !apiData.main || !apiData.weather || !apiData.wind) {
        console.error("Incomplete data received from weather API:", apiData);
        throw new Error("Incomplete data received from weather API.");
    }
    return {
        temperature: apiData.main.temp,
        feelsLike: apiData.main.feels_like,
        minTemp: apiData.main.temp_min,
        maxTemp: apiData.main.temp_max,
        pressure: apiData.main.pressure,
        humidity: apiData.main.humidity,
        description: apiData.weather[0]?.description || 'N/A',
        icon: apiData.weather[0]?.icon || 'N/A',
        windSpeed: apiData.wind.speed,
        windDeg: apiData.wind.deg,
        clouds: apiData.clouds?.all || 0,
        rainVolume: apiData.rain ? (apiData.rain['1h'] || apiData.rain['3h'] || 0) : 0,
        sunrise: apiData.sys?.sunrise || null,
        sunset: apiData.sys?.sunset || null,
        // Metadata from API
        apiTimestamp: apiData.dt, // Unix timestamp from API
        cityNameFromApi: apiData.name, // Useful for verification
        timezone: apiData.timezone, // Offset in seconds from UTC
    };
};


/**
 * Persists fetched weather data to the database.
 * @param {string} city - The city name.
 * @param {object} data - The weather data object (mapped format).
 * @param {object} locationDoc - The mongoose Location document to link to.
 * @param {string} source - 'api' or 'cache'.
 */
const persistWeatherData = async (city, data, locationDoc, source = 'api') => {
  if (!locationDoc || !locationDoc._id) {
    // console.warn(`Cannot persist weather for ${city}: Location document not provided.`);
    // Allow not persisting if location isn't saved yet, e.g., for general city search
    return;
  }

  try {
    const record = new WeatherData({
      location: locationDoc._id,
      city: city.toLowerCase(),
      timestamp: new Date(), // Time of logging
      apiTimestamp: data.apiTimestamp, // Timestamp from API
      data: data, // Store the mapped data object
      source: source,
    });
    await record.save();
    console.log(`Persisted weather data for ${city} (source: ${source})`);
  } catch (error) {
    console.error(`Error persisting weather data for ${city}:`, error.message);
    // Don't let persistence failure stop the main weather request
  }
};

/**
 * Fetches historical weather data from the database.
 * @param {string} locationId - The ID of the saved location.
 * @param {Date} startDate - The start date for the history.
 * @param {Date} endDate - The end date for the history.
 * @returns {Promise<Array>} - Array of historical weather data records.
 */
const getHistoricalWeatherData = async (locationId, startDate, endDate) => {
  try {
    const history = await WeatherData.find({
      location: locationId,
      timestamp: { $gte: startDate, $lte: endDate },
    }).sort({ timestamp: 'asc' }); // Sort oldest first

    return history;
  } catch (error) {
    console.error(`Error fetching historical data for location ${locationId}:`, error.message);
    throw new Error('Could not fetch historical weather data.');
  }
};


export { getCurrentWeatherByCity, getHistoricalWeatherData };