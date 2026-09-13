/**
 * Parses Google Cloud Vision API text detection response using regex heuristics
 * Supports multi-bill receipt line-item extraction (extracting multiple bill numbers & amounts)
 * @param {Object} visionResponse - Response object from Vision API
 * @returns {Object} Extracted metadata: { billNo, name, amount, items, confidence }
 */
export const parseOcrResponse = (visionResponse) => {
  const fullText = visionResponse?.fullTextAnnotation?.text ||
                   visionResponse?.textAnnotations?.[0]?.description ||
                   '';

  if (!fullText || fullText.trim().length === 0) {
    return { billNo: '', name: '', amount: null, items: [], confidence: 'failed' };
  }

  const text = fullText;

  // ── 1. Single Primary Bill Number Extraction ────────────────────────────
  const billNoPatterns = [
    /(?:bill\s*no|invoice\s*no|voucher\s*no|receipt\s*no|ref(?:erence)?)\s*[#:\.\-]?\s*([A-Z0-9\-\/]+)/i,
    /(?:no|sr\.?\s*no)\s*[:\.\-]\s*([A-Z0-9\-\/]+)/i,
    /^([A-Z]{0,3}\d{3,8}[A-Z]?)$/m,
  ];

  let billNo = '';
  for (const pattern of billNoPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().toUpperCase();
      const isLikelyPhone = /^[6-9]\d{9}$/.test(candidate);
      if (candidate.length >= 1 && candidate.length <= 20 && !isLikelyPhone) {
        billNo = candidate;
        break;
      }
    }
  }

  // ── 2. Single Primary Total Amount Extraction ──────────────────────────
  const amountPatterns = [
    /(?:grand\s*total|net\s*total|total\s*amount|total)\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:amount|rs\.?|₹)\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /₹\s*([\d,]+(?:\.\d{1,2})?)/,
    /(?:rs|inr)\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]{3,}(?:\.\d{1,2})?)\s*(?:\/\-|only|inr|rs)/i,
  ];

  let amount = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0 && parsed < 10000000) { // sanity bound < 1 crore
        amount = parsed;
        break;
      }
    }
  }

  // ── 3. Name Extraction ─────────────────────────────────────────────────
  const namePatterns = [
    /(?:customer|party|name|buyer|supplier|to|m\/s)\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.]{2,50}?)(?:\n|$)/i,
    /(?:bill\s*to|sold\s*to|ship\s*to)\s*[:\n]\s*([A-Za-z][A-Za-z\s\.]{2,50}?)(?:\n|$)/i,
  ];

  let name = '';
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidateName = match[1].trim();
      if (candidateName.length >= 2 && candidateName.length <= 80 && !/^\d+$/.test(candidateName)) {
        name = candidateName;
        break;
      }
    }
  }

  // ── 4. Multi-Bill Line Item Extraction ─────────────────────────────────
  // Scans lines for multiple bill numbers and their individual payment amounts
  const items = [];
  const lines = text.split(/\r?\n/);
  const seenBillNos = new Set();

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Pattern A: "Bill No: BILL-101 Rs. 5000", "INV-204 : ₹12,000", "BILL-001 5000/-"
    const lineItemPattern = /(?:bill\s*no|invoice\s*no|voucher\s*no|ref)?\s*[#:\.\-]?\s*([A-Z0-9\-\/]{2,20})\s*(?:[:\-|\s]+)\s*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i;
    const match = cleanLine.match(lineItemPattern);

    if (match && match[1] && match[2]) {
      let itemBillNo = match[1].trim().toUpperCase();
      const itemAmount = parseFloat(match[2].replace(/,/g, ''));

      // Avoid matching generic keywords like TOTAL, AMOUNT, DATE
      const isPhone = /^[6-9]\d{9}$/.test(itemBillNo);
      const isReservedWord = /^(TOTAL|AMOUNT|SUBTOTAL|GRAND|DATE|PAGE|THANK|REC|RECEIPT)$/i.test(itemBillNo);

      if (
        !isPhone &&
        !isReservedWord &&
        itemBillNo.length >= 2 &&
        itemBillNo.length <= 20 &&
        !isNaN(itemAmount) &&
        itemAmount > 0 &&
        itemAmount < 10000000
      ) {
        if (!seenBillNos.has(itemBillNo)) {
          seenBillNos.add(itemBillNo);
          items.push({ billNo: itemBillNo, amount: itemAmount });
        }
      }
    }
  }

  // Fallback: If no multi-line items were matched, but primary billNo and amount exist
  if (items.length === 0 && billNo) {
    items.push({ billNo, amount: amount || 0 });
  }

  // ── 5. Confidence Scoring ──────────────────────────────────────────────
  const fieldsFound = [billNo !== '', name !== '', amount !== null, items.length > 0].filter(Boolean).length;
  const confidence = fieldsFound >= 3 ? 'high' : fieldsFound >= 1 ? 'medium' : 'low';

  return { billNo, name, amount, items, confidence };
};

export default {
  parseOcrResponse
};
