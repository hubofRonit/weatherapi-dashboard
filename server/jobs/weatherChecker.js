// server/jobs/weatherChecker.js
import cron from 'node-cron';
import { checkAlerts } from '../services/alertService.js';

// Schedule the checkAlerts function to run periodically
// Example: Run every hour at the beginning of the hour
const scheduleAlertChecks = () => {
  // Cron pattern: second minute hour day-of-month month day-of-week
  // '0 * * * *' means at minute 0 of every hour
  cron.schedule('0 * * * *', () => {
    console.log('Triggering hourly weather alert check...');
    checkAlerts(); // Call the alert checking logic from the service
  }, {
    scheduled: true,
    timezone: "UTC" // Specify timezone or it uses server's timezone. UTC is often preferred.
  });

  console.log('Weather alert check job scheduled to run every hour.');

  // Example: Run once daily at 7:00 AM UTC
  // cron.schedule('0 7 * * *', () => {
  //   console.log('Triggering daily weather alert check at 7:00 AM UTC...');
  //   checkAlerts();
  // }, {
  //   scheduled: true,
  //   timezone: "UTC"
  // });

  // You can add more schedules here if needed
};

export default scheduleAlertChecks;