// server/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import config from '../config/index.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Get user from the token (select everything except password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
          res.status(401);
          throw new Error('Not authorized, user not found');
      }

      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

export { protect };