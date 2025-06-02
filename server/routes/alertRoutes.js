// server/routes/alertRoutes.js
import express from 'express';
import {
  createAlert,
  getAlerts,
  updateAlert,
  deleteAlert,
} from '../controllers/alertController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All alert routes are protected
router.use(protect);

router.route('/')
  .post(createAlert) // Create a new alert
  .get(getAlerts);   // Get all alerts for the user

router.route('/:id')
  .put(updateAlert)   // Update a specific alert
  .delete(deleteAlert); // Delete a specific alert

export default router;