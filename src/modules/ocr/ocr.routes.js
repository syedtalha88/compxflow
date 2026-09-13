import express from 'express';
import { extractFromImage } from './ocr.controller.js';
import authenticate from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';

const router = express.Router();

// Protected OCR extraction endpoint (requires valid access token & image file)
router.post('/extract', authenticate, upload.single('image'), extractFromImage);

export default router;
