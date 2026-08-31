import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import tenantMiddleware from './middleware/tenant.js';
import { successResponse, errorResponse } from './utils/apiResponse.js';
import ApiError from './utils/apiError.js';
import authRoutes from './modules/auth/auth.routes.js';
import ocrRoutes from './modules/ocr/ocr.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import purchaseRoutes from './modules/purchases/purchase.routes.js';
import purchasePaymentRoutes from './modules/purchasePayments/purchasePayment.routes.js';
import expenseRoutes from './modules/expenses/expense.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import superAdminRoutes from './modules/superAdmin/superAdmin.routes.js';
import tenantAdminRoutes from './modules/tenantAdmin/tenantAdmin.routes.js';

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false, // For serving images/uploads if needed
}));

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later.'
  }
});
app.use(globalLimiter);

// Body Parsing & Cookie Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// MongoDB Operator Injection Prevention (HIGH-01)
// Strips $, . from req.body, req.query, req.params before they reach controllers
app.use(mongoSanitize());

// Tenant Resolution Middleware
app.use(tenantMiddleware);

// Health Check Route
app.get('/api/health', (req, res) => {
  return successResponse(res, 200, {
    status: 'ok',
    tenant: req.tenant ? req.tenant.slug : null
  }, 'Health check OK');
});

// Auth-specific Rate Limiters (stricter than global)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many registration attempts. Please try again later.'
  }
});

// API Feature Modules — Auth endpoints with dedicated rate limiters
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/pin-login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth', authRoutes);

// OCR-specific rate limiter — expensive external API calls (MEDIUM-03)
const ocrLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 OCR requests per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many OCR requests. Please try again in a few minutes.'
  }
});
app.use('/api/ocr', ocrLimiter);
app.use('/api/ocr', ocrRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/purchase-payments', purchasePaymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/tenant-admin', tenantAdminRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${req.originalUrl} not found`));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return errorResponse(res, 400, 'VALIDATION_ERROR', messages.join(', '));
  }

  // Handle MongoDB Duplicate Key Errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, 409, 'DUPLICATE_ERROR', `A record with this ${field} already exists.`);
  }

  const statusCode = err.statusCode || 500;
  const errorConstant = err.error || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An internal server error occurred';

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('Unhandled Error:', err);
  }

  return errorResponse(res, statusCode, errorConstant, message);
});

export default app;
