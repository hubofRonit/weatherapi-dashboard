// server/routes/weatherRoutes.js
import express from 'express';
import {
  getCurrentWeather,
  addLocation,
  getSavedLocations,
  deleteLocation,
  getHistory
} from '../controllers/weatherController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to get current weather for any city
router.get('/current', getCurrentWeather);

// Protected routes for managing user's saved locations
router.route('/locations')
  .post(protect, addLocation)   // Add a new location
  .get(protect, getSavedLocations); // Get all saved locations for the user

// Protected route for deleting a specific location
router.delete('/locations/:id', protect, deleteLocation);

// Protected route for getting historical data for a specific saved location
router.get('/history/:locationId', protect, getHistory);

export default router;