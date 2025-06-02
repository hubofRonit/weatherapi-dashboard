// server/controllers/userController.js
import asyncHandler from 'express-async-handler';
// User model might be needed if you expand functionality, e.g., update profile
// import User from '../models/User.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is attached by the 'protect' middleware
  const user = req.user;

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// Add other user-related controllers here if needed (e.g., updateProfile)

export { getUserProfile };