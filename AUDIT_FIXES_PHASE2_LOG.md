# Security Audit Fixes Changelog (Phase 2)

This document tracks the specific code changes implemented to resolve the security vulnerabilities discovered during the second phase of the FactFlow backend audit based on the AI Security Guide.

---

## 1. Tenant Isolation Bypass via Header Spoofing (CRITICAL)

**Files Affected:** `backend/src/middleware/auth.js`

### What Changed & Why
**Why:** The `tenantMiddleware` resolved the tenant context from the `x-tenant-slug` header, but the application never verified if the authenticated user (`req.user`) actually belonged to that tenant. A valid user from Tenant A could simply send `x-tenant-slug: TENANT_B` and gain full administrative access to Tenant B's data, completely breaking multi-tenant isolation.
**Change:** Injected an explicit check inside `auth.js` that compares the `tenantId` inside the decoded JWT against the resolved `req.tenant.id`. If they don't match, access is immediately blocked with a `403 Forbidden`.

### Old Code
```javascript
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role
    };

    next();
```

### New Code
```javascript
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role
    };

    // CRITICAL: Tenant Isolation Enforcement
    // Ensures a user from Tenant A cannot access Tenant B's data by spoofing the slug header
    if (req.tenant && req.tenant.id.toString() !== decoded.tenantId.toString()) {
      throw new ApiError(403, 'TENANT_MISMATCH', 'Access token does not match the requested tenant context');
    }

    next();
```

---

## 2. Financial Race Conditions (Lost Updates) (HIGH)

**Files Affected:** 
- `backend/src/modules/payments/payment.controller.js`
- `backend/src/modules/purchasePayments/purchasePayment.controller.js`

### What Changed & Why
**Why:** When payments were recorded, the server loaded the invoice into Node.js memory, modified the `amountReceived` variable, and called `.save()`. If two payments occurred simultaneously, they would both read the exact same original `amountReceived` value, compute the addition, and write it back. One payment would cleanly overwrite and erase the other's total, leading to data corruption (Lost Update problem).
**Change:** Refactored the financial update to use MongoDB's atomic `$inc` operator alongside Optimistic Concurrency Control (OCC). We now use `findOneAndUpdate` querying not just by `_id`, but also by the original `amountReceived`. If the update fails, we know another transaction modified the invoice, and we abort safely instead of corrupting data.

### Old Code
```javascript
    invoice.amountReceived += paymentAmount;
    await invoice.save({ session }); 
```

### New Code
```javascript
    const newPending = invoice.amountPending - paymentAmount;
    const newStatus = newPending <= 0 ? 'paid' : 'partially_paid';

    const updatedInvoice = await Invoice.findOneAndUpdate(
      { 
        _id: invoiceId, 
        tenantId,
        amountReceived: invoice.amountReceived // OCC check
      },
      {
        $inc: { amountReceived: paymentAmount },
        $set: { amountPending: newPending, status: newStatus }
      },
      { new: true, session }
    );

    if (!updatedInvoice) {
      throw new ApiError(409, 'CONCURRENT_MODIFICATION', 'The invoice was modified by another transaction. Please try again.');
    }
```

---

## 3. Missing Request Idempotency (HIGH)

**Files Affected:** 
- `backend/src/modules/payments/payment.controller.js`
- `backend/src/modules/purchasePayments/purchasePayment.controller.js`

### What Changed & Why
**Why:** If a user double-clicked the "Submit Payment" button, or if network instability caused automatic browser retries, the server would happily process the identical request multiple times, creating duplicate financial records.
**Change:** Added a pre-flight database check targeting the `receiptImagePublicId` (which is uniquely generated per upload by Cloudinary). If a payment already exists for this unique receipt image, the duplicate request is blocked before any financial transactions begin.

### Old Code
```javascript
  // No idempotency checks. Execution proceeded straight to checking invoice status.
  if (paymentAmount > invoice.amountPending) { ... }
```

### New Code
```javascript
  // FIN-05: Idempotency check to prevent duplicate payments on double-clicks
  const existingPayment = await Payment.findOne({ receiptImagePublicId, tenantId });
  if (existingPayment) {
    throw new ApiError(409, 'DUPLICATE_PAYMENT', 'A payment with this receipt image has already been recorded');
  }
```

---

## 4. Missing Negative Value Validations (MEDIUM)

**Files Affected:** `backend/src/modules/invoices/invoice.controller.js`

### What Changed & Why
**Why:** The invoice controller did not natively reject negative numbers for `totalAmount` during creation or updates. Although the Mongoose Schema fallback (`min: 0`) would eventually catch it, proper validation at the controller layer prevents malformed data from touching the database processing layer at all.
**Change:** Added explicit `isNaN` and `< 0` checks when parsing the `totalAmount` parameter.

### Old Code
```javascript
  if (!billNo || !customerName || totalAmount === undefined || !billImageUrl || !billImagePublicId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'billNo, customerName, totalAmount, billImageUrl, and billImagePublicId are required');
  }
```

### New Code
```javascript
  if (!billNo || !customerName || totalAmount === undefined || !billImageUrl || !billImagePublicId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'billNo, customerName, totalAmount, billImageUrl, and billImagePublicId are required');
  }

  const parsedAmount = parseFloat(totalAmount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    throw new ApiError(400, 'INVALID_AMOUNT', 'Invoice total amount cannot be negative');
  }
```

---

## 5. Production Security Headers (Helmet) (MEDIUM)

**Files Affected:** `backend/src/app.js`, `backend/package.json`

### What Changed & Why
**Why:** The Express application lacked critical HTTP security headers (like Content-Security-Policy, HTTP Strict-Transport-Security, and X-Frame-Options), leaving the frontend PWA exposed to Clickjacking and MIME-sniffing injection attacks.
**Change:** Installed the `helmet` package via `npm` and applied it at the top level of the Express middleware stack to inject secure defaults into every HTTP response.

### Old Code
```javascript
import express from 'express';
import cors from 'cors';
```

### New Code
```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows serving images/uploads across origins if needed
}));
```
