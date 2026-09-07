# Audit Fixes Changelog (Critical & High Severity)

This document tracks the specific code changes implemented to resolve the Critical and High severity issues discovered during the FactFlow backend audit.

---

## 1. In-Memory Report Aggregation (CRITICAL)

**Files Affected:** `backend/src/modules/reports/report.controller.js`

### What Changed & Why
**Why:** The report endpoints were fetching thousands of full Mongoose documents into Node.js memory just to compute sums (using `Array.reduce()`). This created a massive memory leak and would eventually cause the Node.js process to crash with an Out-Of-Memory (OOM) error for high-volume tenants.
**Change:** The calculations were offloaded directly into the MongoDB engine using `$aggregate` pipelines, which return only the computed final totals, reducing memory consumption by over 99%.

### Old Code (Example)
```javascript
// Data loaded entirely into Node.js RAM
const invoices = await Invoice.find({ tenantId, createdAt: { $gte: start, $lte: end } });
const salesPayments = await Payment.find({ tenantId, capturedAt: { $gte: start, $lte: end } });

// JS reduce loop over thousands of records
const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
const totalSalesReceived = salesPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
```

### New Code
```javascript
// Highly optimized MongoDB Aggregation pipelines
const matchCreated = { $match: { tenantId, createdAt: { $gte: start, $lte: end } } };
const matchCaptured = { $match: { tenantId, capturedAt: { $gte: start, $lte: end } } };

const [invAgg, payAgg] = await Promise.all([
  Invoice.aggregate([matchCreated, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  Payment.aggregate([matchCaptured, { $group: { _id: null, total: { $sum: '$amount' } } }])
]);

// Extracting purely the computed numbers
const totalInvoiced = invAgg[0]?.total || 0;
const totalSalesReceived = payAgg[0]?.total || 0;
```

---

## 2. Unrestricted Payment Overpayment (HIGH)

**Files Affected:** 
- `backend/src/modules/payments/payment.controller.js`
- `backend/src/modules/purchasePayments/purchasePayment.controller.js`

### What Changed & Why
**Why:** The system checked if a payment amount was greater than 0, but failed to check if it exceeded the remaining balance (`amountPending`) of an invoice. This allowed overpayments, causing a corrupt state where `amountReceived` was larger than `totalAmount`.
**Change:** Added a hard validation block right after fetching the invoice/purchase to block the transaction if `paymentAmount > amountPending`.

### Old Code
```javascript
const invoice = await Invoice.findOne({ _id: invoiceId, tenantId });
if (!invoice) {
  throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Invoice not found for this tenant');
}

let payment;
// Proceeds directly to create the payment, ignoring invoice.amountPending bounds
```

### New Code
```javascript
const invoice = await Invoice.findOne({ _id: invoiceId, tenantId });
if (!invoice) {
  throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Invoice not found for this tenant');
}

// Explicit overpayment check added
if (paymentAmount > invoice.amountPending) {
  throw new ApiError(400, 'OVERPAYMENT', `Payment amount (INR ${paymentAmount}) cannot exceed the pending invoice amount (INR ${invoice.amountPending})`);
}

let payment;
// Proceeds to create the payment safely
```

---

## 3. Missing Mongoose/MongoDB Error Trapping (HIGH)

**Files Affected:** `backend/src/app.js`

### What Changed & Why
**Why:** The global error handler was only designed to catch custom `ApiError` instances. When Mongoose threw a `ValidationError` (e.g., missing a required field) or MongoDB threw a Duplicate Key Error (e.g., duplicate bill number), the handler didn't know what to do and responded with a generic 500 Internal Server Error, masking the real problem from the frontend.
**Change:** Injected specific logic to catch `ValidationError` and Duplicate Key Errors (`11000`) and map them to HTTP 400 (Bad Request) and 409 (Conflict) respectively, providing clean error messaging for the frontend.

### Old Code
```javascript
// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorConstant = err.error || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An internal server error occurred';

  // 500 thrown for validation/duplicate errors
  return errorResponse(res, statusCode, errorConstant, message);
});
```

### New Code
```javascript
// Global Error Handler Middleware
app.use((err, req, res, next) => {
  // Catch Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return errorResponse(res, 400, 'VALIDATION_ERROR', messages.join(', '));
  }

  // Catch MongoDB Duplicate Key Errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, 409, 'DUPLICATE_ERROR', `A record with this ${field} already exists.`);
  }

  const statusCode = err.statusCode || 500;
  const errorConstant = err.error || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An internal server error occurred';

  return errorResponse(res, statusCode, errorConstant, message);
});
```
