// server/server.js
import express from 'express';
import path from 'path'; // Core Node.js module for working with file paths
import { fileURLToPath } from 'url'; // To handle __dirname in ES modules
import cors from 'cors';
import config from './config/index.js';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import scheduleAlertChecks from './jobs/weatherChecker.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import alertRoutes from './routes/alertRoutes.js';

// ES module equivalents for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Body parser for JSON requests
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded requests

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertRoutes);

// --- Serve Frontend Static Files ---
// Determine the correct path to the 'public' directory relative to 'server.js'
const publicDirectoryPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicDirectoryPath));

// Catch-all handler for any request that doesn't match an API route or a static file
// This sends the main index.html file, allowing client-side routing to take over.
app.get('*', (req, res) => {
  res.sendFile(path.resolve(publicDirectoryPath, 'index.html'));
});


// --- Error Handling Middleware ---
// Place these after all your routes
app.use(notFound); // Handles 404 errors (requests to non-existent routes)
app.use(errorHandler); // Handles all other errors passed via next(err)

// --- Start Scheduled Jobs ---
if (config.env !== 'test') { // Don't run cron jobs during tests
    scheduleAlertChecks();
}

// --- Start Server ---
const PORT = config.port;
app.listen(PORT, () => console.log(`Server running in ${config.env} mode on port ${PORT}`));