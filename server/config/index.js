// server/config/index.js
import dotenv from 'dotenv';
dotenv.config(); // Adjust path if needed based on where you run node

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  weatherApiKey: process.env.WEATHER_API_KEY,
  weatherApiBaseUrl: process.env.WEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5',
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
    secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465 // true for 465, false for other ports
  },
  cacheTtl: parseInt(process.env.CACHE_TTL || '600', 10), // Default 10 minutes
};

// Basic validation
if (!config.mongodbUri || !config.jwtSecret || !config.weatherApiKey || !config.email.user || !config.email.pass) {
  console.error('FATAL ERROR: Missing required environment variables.');
  process.exit(1);
}

export default config;