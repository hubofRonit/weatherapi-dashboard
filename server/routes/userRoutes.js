// server/routes/userRoutes.js
import express from 'express';
import { getUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js'; // Import protect middleware

const router = express.Router();

// Apply the protect middleware to this route
router.get('/profile', protect, getUserProfile);

// Add other user-related routes here

export default router;