import cloudinary from '../../config/cloudinary.js';
import { extractTextFromImageUrl } from '../../config/ocr.js';
import { parseOcrResponse } from './ocr.parser.js';
import OcrJob from '../../models/OcrJob.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';
import ApiError from '../../utils/apiError.js';

/**
 * POST /api/ocr/extract
 * Uploads image buffer to Cloudinary -> passes URL to Google Vision -> parses text -> logs OcrJob
 */
export const extractFromImage = asyncHandler(async (req, res) => {
  const type = req.body.type || 'invoice';
  const tenantId = req.tenant.id;

  if (!req.file) {
    throw new ApiError(400, 'IMAGE_REQUIRED', 'Image file is required');
  }

  // Step 1: Upload image buffer to Cloudinary (with retry logic)
  let cloudinaryResult;
  let attempt = 0;
  const maxAttempts = 3;
  let lastUploadError = null;

  while (attempt < maxAttempts) {
    try {
      cloudinaryResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `compxflow/${tenantId}/${type}s`,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [
              { quality: 'auto', fetch_format: 'auto' },
              { width: 1200, crop: 'limit' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      break; // Success, exit retry loop
    } catch (uploadError) {
      attempt++;
      lastUploadError = uploadError;
      console.warn(`Cloudinary Upload Failed (Attempt ${attempt}/${maxAttempts}):`, uploadError.message);
      if (attempt < maxAttempts) {
        // Wait 2 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  if (!cloudinaryResult) {
    throw new ApiError(500, 'UPLOAD_FAILED', `Failed to upload image to Cloudinary after ${maxAttempts} attempts: ${lastUploadError?.message}`);
  }

  const { secure_url: imageUrl, public_id: imagePublicId } = cloudinaryResult;

  // Step 2: Google Cloud Vision OCR Extraction
  let visionResponse = null;
  let extractedData = { billNo: '', name: '', amount: null, items: [] };
  let confidence = 'failed';
  let ocrStatus = 'failed';

  try {
    visionResponse = await extractTextFromImageUrl(imageUrl);
    const parsed = parseOcrResponse(visionResponse);

    extractedData = {
      billNo: parsed.billNo,
      name: parsed.name,
      amount: parsed.amount,
      items: parsed.items || []
    };

    confidence = parsed.confidence;
    ocrStatus = parsed.confidence === 'failed' ? 'failed' :
                parsed.confidence === 'low' ? 'partial' : 'success';
  } catch (ocrError) {
    // OCR failure rule: NEVER throw 500 error for OCR failure alone. Return empty fields gracefully.
    console.warn('OCR processing warning:', ocrError.message);
    confidence = 'failed';
    ocrStatus = 'failed';
  }

  // Step 3: Log OcrJob document in MongoDB (always, even on failure)
  try {
    await OcrJob.create({
      tenantId,
      imageUrl,
      type,
      rawResponse: visionResponse,
      extractedData,
      confidence,
      status: ocrStatus
    });
  } catch (dbError) {
    console.error('Failed to log OcrJob:', dbError.message);
  }

  // Step 4: Return response
  return successResponse(res, 200, {
    billNo: extractedData.billNo,
    name: extractedData.name,
    amount: extractedData.amount,
    items: extractedData.items,
    imageUrl,
    imagePublicId,
    confidence
  }, 'OCR extraction completed');
});

export default {
  extractFromImage
};
