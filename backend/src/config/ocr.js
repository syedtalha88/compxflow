import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends Cloudinary image URL to Google Cloud Vision API for TEXT_DETECTION
 * @param {string} imageUrl - Public HTTP/HTTPS URL of uploaded image
 * @returns {Promise<Object>} First response item from Google Vision API
 */
export const extractTextFromImageUrl = async (imageUrl) => {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey || apiKey.startsWith('dummy')) {
    throw new Error('Google Vision API key is missing or invalid');
  }

  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestBody = {
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
    }]
  };

  const response = await fetch(visionApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${data.error?.message || response.statusText}`);
  }

  return data.responses?.[0] || null;
};

export default {
  extractTextFromImageUrl
};
