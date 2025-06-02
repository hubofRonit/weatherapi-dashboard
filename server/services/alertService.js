// server/services/alertService.js
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import Location from '../models/Location.js';
import { getCurrentWeatherByCity } from './weatherService.js';
import sendEmail from './emailService.js';
import mongoose from 'mongoose';

const checkAlerts = async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled alert check...`);

  try {
    // Find all enabled alerts, populate user email and location details
    const activeAlerts = await Alert.find({ isEnabled: true })
        .populate('user', 'email name') // Populate user's email and name
        .populate('location', 'city name'); // Populate location's city and name

    if (!activeAlerts || activeAlerts.length === 0) {
      console.log('No active alerts found.');
      return;
    }

    console.log(`Found ${activeAlerts.length} active alerts to check.`);

    // Group alerts by city to minimize weather API calls
    const alertsByCity = activeAlerts.reduce((acc, alert) => {
        // Ensure user and location were populated correctly
      if (!alert.user || !alert.location) {
          console.warn(`Skipping alert ${alert._id}: Missing user or location data (potentially deleted).`);
          return acc;
      }
      const city = alert.location.city; // Use city from populated location
      if (!acc[city]) {
        acc[city] = [];
      }
      acc[city].push(alert);
      return acc;
    }, {});

    // Process alerts for each city
    for (const city in alertsByCity) {
      try {
        // Fetch current weather for the city (will use cache if available)
        // Pass a representative locationDoc if possible, though not strictly necessary here
        // as persistence link might not be the primary goal in the alert check.
        const locationDocForCity = alertsByCity[city][0].location; // Use the first alert's location doc
        const currentWeatherData = await getCurrentWeatherByCity(city, locationDocForCity);

        if (!currentWeatherData) {
          console.warn(`Could not get weather data for ${city}, skipping alerts for this city.`);
          continue;
        }

        // Check each alert for this city against the fetched weather data
        for (const alert of alertsByCity[city]) {
          const shouldNotify = evaluateAlertCondition(alert, currentWeatherData);

          if (shouldNotify) {
            // Implement cooldown logic (optional)
            // const now = new Date();
            // const cooldownPeriod = (alert.cooldownHours || 6) * 60 * 60 * 1000; // Default 6 hours
            // if (alert.lastNotified && (now.getTime() - alert.lastNotified.getTime() < cooldownPeriod)) {
            //   console.log(`Alert ${alert._id} for ${city} triggered, but within cooldown period.`);
            //   continue; // Skip notification due to cooldown
            // }

            console.log(`ALERT TRIGGERED: User ${alert.user.email}, Location ${alert.location.name} (${city}), Condition: ${alert.condition} ${alert.threshold}`);

            // Send email notification
            await notifyUser(alert, currentWeatherData);

            // Update the alert's lastNotified timestamp
            alert.lastNotified = new Date();
            await alert.save();
          }
        }
      } catch (error) {
        console.error(`Error processing alerts for city ${city}:`, error.message);
        // Continue to the next city even if one fails
      }
    }

    console.log('Finished alert check.');

  } catch (error) {
    console.error('Error during scheduled alert check:', error);
  }
};

// Evaluates if an alert condition is met based on current weather
const evaluateAlertCondition = (alert, weatherData) => {
  const { condition, threshold } = alert;
  const data = weatherData; // Use the mapped data structure from weatherService

  try {
      switch (condition) {
        case 'temp_gt':
          return typeof data.temperature === 'number' && typeof threshold === 'number' && data.temperature > threshold;
        case 'temp_lt':
          return typeof data.temperature === 'number' && typeof threshold === 'number' && data.temperature < threshold;
        case 'humidity_gt':
          return typeof data.humidity === 'number' && typeof threshold === 'number' && data.humidity > threshold;
        case 'wind_gt':
          return typeof data.windSpeed === 'number' && typeof threshold === 'number' && data.windSpeed > threshold;
        case 'rain_likely': // This might need adjustment based on API data (e.g., checking rain volume or description)
          // Example: Trigger if rain volume > 0 or description contains 'rain'
          const rainThreshold = typeof threshold === 'number' ? threshold : 0; // Default threshold 0 if not specified
          const hasRainVolume = typeof data.rainVolume === 'number' && data.rainVolume > rainThreshold;
          const descriptionMentionsRain = typeof data.description === 'string' && data.description.toLowerCase().includes('rain');
          return hasRainVolume || descriptionMentionsRain;
        case 'desc_contains':
            return typeof data.description === 'string' && typeof threshold === 'string' && data.description.toLowerCase().includes(threshold.toLowerCase());
        default:
          console.warn(`Unknown alert condition: ${condition}`);
          return false;
      }
  } catch (evalError) {
      console.error(`Error evaluating condition "${condition}" for alert ${alert._id}:`, evalError);
      return false; // Don't trigger alert if evaluation fails
  }
};

// Sends the notification email to the user
const notifyUser = async (alert, weatherData) => {
  if (!alert.user || !alert.user.email) {
      console.error(`Cannot notify for alert ${alert._id}: User email is missing.`);
      return;
  }
  if (!alert.location || !alert.location.name) {
      console.error(`Cannot notify for alert ${alert._id}: Location details missing.`);
      return; // Should not happen if population worked
  }

  const { user, location, condition, threshold } = alert;
  const prettyCondition = formatCondition(condition, threshold); // Make condition readable
  const subject = `Weather Alert Triggered for ${location.name}`;
  const textBody = `
Hi ${user.name || 'User'},

A weather alert you set for ${location.name} (${location.city}) has been triggered.

Condition: ${prettyCondition}
Current Weather:
- Temperature: ${weatherData.temperature}°C
- Feels Like: ${weatherData.feelsLike}°C
- Humidity: ${weatherData.humidity}%
- Wind: ${weatherData.windSpeed} m/s
- Description: ${weatherData.description}

You can manage your alerts in the dashboard.
  `;
  const htmlBody = `
<p>Hi ${user.name || 'User'},</p>
<p>A weather alert you set for <strong>${location.name} (${location.city})</strong> has been triggered.</p>
<p><strong>Condition:</strong> ${prettyCondition}</p>
<p><strong>Current Weather:</strong></p>
<ul>
  <li>Temperature: ${weatherData.temperature}°C</li>
  <li>Feels Like: ${weatherData.feelsLike}°C</li>
  <li>Humidity: ${weatherData.humidity}%</li>
  <li>Wind: ${weatherData.windSpeed} m/s</li>
  <li>Description: ${weatherData.description}</li>
</ul>
<p>You can manage your alerts in the dashboard.</p>
  `;

  await sendEmail(user.email, subject, textBody, htmlBody);
};

// Helper to format the condition for display
const formatCondition = (condition, threshold) => {
    switch (condition) {
        case 'temp_gt': return `Temperature is above ${threshold}°C`;
        case 'temp_lt': return `Temperature is below ${threshold}°C`;
        case 'humidity_gt': return `Humidity is above ${threshold}%`;
        case 'wind_gt': return `Wind speed is above ${threshold} m/s`;
        case 'rain_likely': return `Rain is likely (check details)`; // Adjust if threshold used differently
        case 'desc_contains': return `Description contains "${threshold}"`;
        default: return `${condition} ${threshold}`;
    }
};


export { checkAlerts };