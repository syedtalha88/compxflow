# OCR_PIPELINE.md — FactFlow OCR Reference

## Service: Google Cloud Vision API
## Feature used: TEXT_DETECTION
## Tier: Free (1,000 units/month)
## Auth method: API Key (simplest for this scale)

---

## Why Google Vision over Tesseract/EasyOCR

Traditional OCR engines (Tesseract, EasyOCR) are trained on printed text. Handwriting recognition requires a different model. Google Vision handles mixed printed + handwritten text well, which is exactly what factory bills are: printed labels with handwritten values.

---

## Setup

```javascript
// config/ocr.js
// No SDK needed — use Vision REST API directly with API key

export const VISION_API_URL = 
  `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`;

export const extractTextFromImageUrl = async (imageUrl) => {
  const requestBody = {
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
    }]
  };

  const response = await fetch(VISION_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Vision API error: ${data.error?.message}`);
  }
  
  return data.responses[0];
};
```

---

## Extraction Logic

```javascript
// modules/ocr/ocr.parser.js

export const parseOcrResponse = (visionResponse) => {
  // Get the full text annotation (all detected text as one string)
  const fullText = visionResponse?.fullTextAnnotation?.text || 
                   visionResponse?.textAnnotations?.[0]?.description || 
                   '';

  if (!fullText) {
    return { billNo: '', name: '', amount: null, confidence: 'failed' };
  }

  // Normalize: lowercase for pattern matching, preserve original for extraction
  const text = fullText;
  const textLower = fullText.toLowerCase();

  // ── Bill Number Extraction ──────────────────────────────────────────
  // Patterns seen on Indian factory bills:
  // "Bill No: 1234", "Invoice No. 1234", "No: 1234", "Bill# 1234"
  // "Voucher No 1234", "Ref: 1234", "Sr. No. 1234"
  const billNoPatterns = [
    /(?:bill\s*no|invoice\s*no|voucher\s*no|receipt\s*no|ref(?:erence)?)\s*[#:\.\-]?\s*([A-Z0-9\-\/]+)/i,
    /(?:no|sr\.?\s*no)\s*[:\.\-]\s*([A-Z0-9\-\/]+)/i,
    /^([A-Z]{0,3}\d{3,8}[A-Z]?)$/m,   // Standalone bill number pattern (e.g. "INV1234")
  ];

  let billNo = '';
  for (const pattern of billNoPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 1 && match[1].length <= 20) {
      billNo = match[1].trim().toUpperCase();
      break;
    }
  }

  // ── Amount Extraction ───────────────────────────────────────────────
  // Patterns: "Rs. 15,000", "₹15000", "Total: 15,000", "Amount: ₹ 15,000.00"
  // "Net Amount 15000", "Grand Total 15,000/-"
  const amountPatterns = [
    /(?:grand\s*total|net\s*total|total\s*amount|total|amount|rs\.?|₹)\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /₹\s*([\d,]+(?:\.\d{1,2})?)/,
    /(?:rs|inr)\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]{4,}(?:\.\d{1,2})?)\s*(?:\/\-|only|inr|rs)/i,  // "15,000/-" pattern
  ];

  let amount = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Remove commas, parse as float
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0 && parsed < 10000000) { // sanity: < 1 crore
        amount = parsed;
        break;
      }
    }
  }

  // ── Name Extraction ─────────────────────────────────────────────────
  // Patterns: "Name: Ramesh Kumar", "Customer: ABC Traders", "Party: XYZ"
  // "M/s Ramesh Kumar", "To: ABC Pvt Ltd"
  const namePatterns = [
    /(?:customer|party|name|buyer|to|m\/s)\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.]{2,50}?)(?:\n|$)/i,
    /(?:bill\s*to|sold\s*to|ship\s*to)\s*[:\n]\s*([A-Za-z][A-Za-z\s\.]{2,50}?)(?:\n|$)/i,
  ];

  let name = '';
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      // Filter out obviously wrong extractions
      if (name.length >= 2 && name.length <= 80 && !/^\d+$/.test(name)) {
        break;
      }
    }
  }

  // ── Confidence scoring ──────────────────────────────────────────────
  const fieldsFound = [billNo, name, amount !== null].filter(Boolean).length;
  const confidence = fieldsFound === 3 ? 'high' : fieldsFound >= 1 ? 'medium' : 'low';

  return { billNo, name, amount, confidence };
};
```

---

## Complete OCR Controller

```javascript
// modules/ocr/ocr.controller.js

import { v2 as cloudinary } from 'cloudinary';
import { extractTextFromImageUrl } from '../../config/ocr.js';
import { parseOcrResponse } from './ocr.parser.js';
import OcrJob from '../../models/OcrJob.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';

export const extractFromImage = asyncHandler(async (req, res) => {
  const { type } = req.body;
  const tenantId = req.tenant.id;

  if (!req.file) {
    throw new ApiError(400, 'IMAGE_REQUIRED', 'Image file is required');
  }

  // Step 1: Upload to Cloudinary
  let cloudinaryResult;
  try {
    cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `factflow/${tenantId}/${type}s`,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, crop: 'limit' }  // resize large photos
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
  } catch (uploadError) {
    throw new ApiError(500, 'UPLOAD_FAILED', 'Failed to upload image');
  }

  const { secure_url: imageUrl, public_id: imagePublicId } = cloudinaryResult;

  // Step 2: Run OCR
  let visionResponse = null;
  let extractedData = { billNo: '', name: '', amount: null };
  let confidence = 'failed';
  let ocrStatus = 'failed';

  try {
    visionResponse = await extractTextFromImageUrl(imageUrl);
    const parsed = parseOcrResponse(visionResponse);
    extractedData = { billNo: parsed.billNo, name: parsed.name, amount: parsed.amount };
    confidence = parsed.confidence;
    ocrStatus = parsed.confidence === 'failed' ? 'failed' : 
                parsed.confidence === 'low' ? 'partial' : 'success';
  } catch (ocrError) {
    // OCR failed — not a fatal error, return empty fields
    // Image is already uploaded, so we still return the URL
    console.error('OCR extraction failed:', ocrError.message);
  }

  // Step 3: Save OCR job (always, even on failure — for debugging)
  await OcrJob.create({
    tenantId,
    imageUrl,
    type,
    rawResponse: visionResponse,
    extractedData,
    confidence,
    status: ocrStatus
  });

  // Step 4: Return results
  return res.status(200).json(new ApiResponse(
    { ...extractedData, imageUrl, imagePublicId, confidence },
    'OCR extraction completed'
  ));
});
```

---

## Fallback Strategy

```
Image upload fails → 500 error (can't proceed without image URL)
OCR fails → return empty strings, confidence: 'failed', still return 200
OCR returns partial → return what was found, confidence: 'low' or 'medium'
OCR returns all fields → confidence: 'high'

In all non-upload-failure cases:
  → Image is saved to Cloudinary ✓
  → OcrJob is logged ✓
  → Response returned to client ✓
  → Confirm screen shows empty fields if needed ✓
```

---

## Tuning Notes

After testing with Kaleem's bills, update these regex patterns if needed.

Common issues with Indian factory bills:
- Bill numbers sometimes written as: "1234", "INV-1234", "2024-25/1234"
- Amounts often written with commas: "15,000" or without: "15000"
- Some bills use "Rs." some use "₹" some use neither
- Names sometimes have "M/s" prefix (Messrs — common in Indian business)
- Phone numbers can be misidentified as bill numbers (filter: >8 digits = phone, skip)

```javascript
// Add to parseOcrResponse if phone numbers are being captured as bill numbers:
const isLikelyPhone = /^[6-9]\d{9}$/.test(billNo);  // Indian mobile pattern
if (isLikelyPhone) billNo = '';
```

---

## Google Vision Free Tier

- **1,000 units/month free** (each image = 1 unit for TEXT_DETECTION)
- At 20-50 bills/day for Kaleem = 600-1500 images/month
- Free tier covers Kaleem comfortably
- When you add more tenants: monitor usage in Google Cloud Console
- If approaching limit: implement per-tenant OCR usage tracking in OcrJob collection
- Paid tier after free: $1.50 per 1,000 units — still cheap

---

## Testing OCR

```javascript
// test-ocr.js — run this standalone before wiring into the app
// node test-ocr.js path/to/bill.jpg

import { extractTextFromImageUrl } from './src/config/ocr.js';
import { parseOcrResponse } from './src/modules/ocr/ocr.parser.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Upload test image to Cloudinary, then OCR it
const testOcr = async (imagePath) => {
  const result = await cloudinary.uploader.upload(imagePath, { folder: 'ocr-test' });
  console.log('Uploaded:', result.secure_url);
  
  const visionResponse = await extractTextFromImageUrl(result.secure_url);
  console.log('Raw text:', visionResponse?.fullTextAnnotation?.text);
  
  const parsed = parseOcrResponse(visionResponse);
  console.log('Extracted:', parsed);
};

testOcr(process.argv[2]);
```
