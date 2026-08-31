import express from 'express';
import {
  register,
  login,
  refresh,
  logout,
  setupPin,
  pinLogin,
  getMe
} from './auth.controller.js';
import authenticate from '../../middleware/auth.js';

const router = express.Router();

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/pin-login', pinLogin);
router.post('/refresh', refresh);

// Protected auth routes (requires valid access token)
router.post('/logout', authenticate, logout);
router.post('/setup-pin', authenticate, setupPin);
router.get('/me', authenticate, getMe);

export default router;
