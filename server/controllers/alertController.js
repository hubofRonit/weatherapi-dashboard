// server/controllers/alertController.js
import asyncHandler from 'express-async-handler';
import Alert from '../models/Alert.js';
import Location from '../models/Location.js';

// @desc    Create a new alert for a saved location
// @route   POST /api/alerts
// @access  Private
const createAlert = asyncHandler(async (req, res) => {
  const { locationId, condition, threshold } = req.body;

  if (!locationId || !condition || threshold === undefined || threshold === null) {
    res.status(400);
    throw new Error('Location ID, condition, and threshold are required');
  }

  // Find the location to ensure it exists and belongs to the user
  const location = await Location.findOne({ _id: locationId, user: req.user._id });
  if (!location) {
    res.status(404);
    throw new Error('Saved location not found or access denied.');
  }

   // Validate threshold based on condition
   const thresholdValue = parseThreshold(condition, threshold);
   if (thresholdValue === null) {
       res.status(400);
       throw new Error(`Invalid threshold value "${threshold}" for condition "${condition}". Expecting a number or non-empty string for desc_contains.`);
   }


  // Optional: Check if an identical alert already exists
  const existingAlert = await Alert.findOne({
      user: req.user._id,
      location: locationId,
      condition: condition,
      // Note: Comparing mixed type threshold needs care, might need custom check
      // This simple check might suffice for now:
      threshold: thresholdValue
  });

  if (existingAlert) {
      res.status(400);
      throw new Error('An identical alert already exists for this location.');
  }


  const alert = new Alert({
    user: req.user._id,
    location: locationId,
    city: location.city, // Store city for easier lookup in cron job
    condition,
    threshold: thresholdValue, // Store the parsed threshold
    isEnabled: true, // Default to enabled
  });

  const createdAlert = await alert.save();
  res.status(201).json(createdAlert);
});

// Helper to parse and validate threshold based on condition
const parseThreshold = (condition, thresholdInput) => {
    switch (condition) {
        case 'temp_gt':
        case 'temp_lt':
        case 'humidity_gt':
        case 'wind_gt':
        case 'rain_likely': // Assuming threshold is numeric (e.g., minimum mm)
            const num = parseFloat(thresholdInput);
            return !isNaN(num) ? num : null;
        case 'desc_contains':
            return typeof thresholdInput === 'string' && thresholdInput.trim().length > 0 ? thresholdInput.trim() : null;
        default:
            return null; // Unknown condition
    }
}


// @desc    Get all alerts for the logged-in user
// @route   GET /api/alerts
// @access  Private
const getAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.find({ user: req.user._id })
    .populate('location', 'name city') // Populate location details
    .sort({ createdAt: 'desc' });
  res.json(alerts);
});

// @desc    Update an alert (e.g., enable/disable, change threshold)
// @route   PUT /api/alerts/:id
// @access  Private
const updateAlert = asyncHandler(async (req, res) => {
  const { condition, threshold, isEnabled } = req.body;
  const alertId = req.params.id;

  const alert = await Alert.findById(alertId);

  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }

  // Ensure the alert belongs to the logged-in user
  if (alert.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('User not authorized to update this alert');
  }

  // Update fields if provided
  if (condition !== undefined) {
      // Re-validate threshold if condition changes or if threshold is also provided
      const newThreshold = (threshold !== undefined) ? threshold : alert.threshold;
      const parsedNewThreshold = parseThreshold(condition, newThreshold);
      if (parsedNewThreshold === null) {
          res.status(400);
          throw new Error(`Invalid threshold value "${newThreshold}" for condition "${condition}".`);
      }
      alert.condition = condition;
      alert.threshold = parsedNewThreshold; // Update with parsed value
  } else if (threshold !== undefined) {
      // Condition didn't change, just update threshold
      const parsedThreshold = parseThreshold(alert.condition, threshold);
       if (parsedThreshold === null) {
          res.status(400);
          throw new Error(`Invalid threshold value "${threshold}" for condition "${alert.condition}".`);
      }
      alert.threshold = parsedThreshold;
  }


  if (isEnabled !== undefined) {
    alert.isEnabled = Boolean(isEnabled);
  }

  // Reset lastNotified if alert is re-enabled or condition/threshold changes significantly? (Optional logic)
  // alert.lastNotified = null;

  const updatedAlert = await alert.save();
  res.json(updatedAlert);
});

// @desc    Delete an alert
// @route   DELETE /api/alerts/:id
// @access  Private
const deleteAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }

  // Ensure the alert belongs to the logged-in user
  if (alert.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('User not authorized to delete this alert');
  }

  await alert.remove(); // Or alert.deleteOne() depending on Mongoose version

  res.json({ message: 'Alert removed successfully', id: req.params.id });
});

export { createAlert, getAlerts, updateAlert, deleteAlert };