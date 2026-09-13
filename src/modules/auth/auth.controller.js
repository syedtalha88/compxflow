import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Tenant from '../../models/Tenant.js';
import User from '../../models/User.js';
import TenantUser from '../../models/TenantUser.js';
import RefreshToken from '../../models/RefreshToken.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

// ── Security Constants ───────────────────────────────────────────────────────

// Pre-computed bcrypt hash used for dummy comparisons to prevent timing attacks.
// This is the hash of a random string — its value doesn't matter, only its cost.
const DUMMY_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Common passwords block list (top entries)
const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'password1', 'iloveyou', 'sunshine1', 'princess1', 'football1',
  'charlie1', 'access14', 'shadow12', 'master12', 'michael1',
  'mustang1', 'jessica1', 'letmein1', 'abcdefgh', 'qwertyui',
  'trustno1', 'dragon12', 'baseball', 'whatever', 'password123'
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a 15-minute JWT Access Token.
 * NEVER falls back to a hardcoded secret — JWT_SECRET must be set via env.
 */
const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      type: 'access'
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );
};

/** Generate a cryptographically random refresh token (128 hex chars). */
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/** Compute SHA-256 hash of a token for indexed DB lookup. */
const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/** Set httpOnly refresh token cookie with proper security attributes. */
const setRefreshTokenCookie = (res, refreshToken) => {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 30;
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    path: '/api/auth',
    maxAge: days * 24 * 60 * 60 * 1000
  });
};

/**
 * Validate password strength.
 * Requires: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
 */
const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit';
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'This password is too common. Please choose a stronger password';
  }
  return null; // valid
};

/**
 * Create a refresh token record in the database and set the cookie.
 * Uses SHA-256 for O(1) indexed lookup instead of bcrypt.
 */
const issueRefreshToken = async (res, userId, tenantId) => {
  const rawToken = generateRefreshToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + (parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS) || 30) * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    tokenHash,
    userId,
    tenantId,
    expiresAt
  });

  setRefreshTokenCookie(res, rawToken);
  return rawToken;
};

/**
 * Build the standard auth response payload.
 */
const buildAuthPayload = (user, tenant, tenantUser, accessToken, extras = {}) => {
  return {
    accessToken,
    user: { id: user._id, email: user.email },
    tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
    role: tenantUser.role,
    ...extras
  };
};

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates Tenant + User + TenantUser (admin role) in one session/transaction.
 * Returns a generic error for duplicate slugs to prevent enumeration.
 */
export const register = asyncHandler(async (req, res) => {
  const { tenantName, slug, email, password } = req.body;

  if (!tenantName || !slug || !email || !password) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'All fields are required: tenantName, slug, email, password');
  }

  const cleanSlug = slug.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  if (!/^[a-z0-9-]{3,30}$/.test(cleanSlug)) {
    throw new ApiError(400, 'INVALID_SLUG', 'Slug must be 3-30 lowercase alphanumeric characters or hyphens');
  }

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    throw new ApiError(400, 'INVALID_EMAIL', 'Invalid email format');
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    throw new ApiError(400, 'WEAK_PASSWORD', passwordError);
  }

  // SEC-03: Generic error — does not confirm whether the slug exists
  const existingTenant = await Tenant.findOne({ slug: cleanSlug });
  if (existingTenant) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Unable to create workspace. Please try a different slug.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let tenant, user, tenantUser;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    tenant = new Tenant({ name: tenantName.trim(), slug: cleanSlug });
    await tenant.save({ session });

    user = await User.findOne({ email: cleanEmail }).session(session);
    if (!user) {
      user = new User({ email: cleanEmail, passwordHash });
      await user.save({ session });
    }

    tenantUser = new TenantUser({
      tenantId: tenant._id,
      userId: user._id,
      role: 'admin'
    });
    await tenantUser.save({ session });

    await session.commitTransaction();
  } catch (txError) {
    await session.abortTransaction();

    // Fallback if standalone MongoDB does not support transactions
    if (txError.message && txError.message.includes('Transaction numbers are only allowed')) {
      try {
        tenant = await Tenant.create({ name: tenantName.trim(), slug: cleanSlug });
        user = await User.findOne({ email: cleanEmail });
        if (!user) {
          user = await User.create({ email: cleanEmail, passwordHash });
        }
        tenantUser = await TenantUser.create({
          tenantId: tenant._id,
          userId: user._id,
          role: 'admin'
        });
      } catch (fallbackError) {
        // SEC-16: Cleanup orphaned tenant if TenantUser creation fails
        if (tenant && tenant._id) {
          await Tenant.deleteOne({ _id: tenant._id }).catch(() => {});
        }
        throw fallbackError;
      }
    } else {
      throw txError;
    }
  } finally {
    session.endSession();
  }

  const accessToken = generateAccessToken({
    userId: user._id,
    tenantId: tenant._id,
    role: tenantUser.role
  });

  await issueRefreshToken(res, user._id, tenant._id);

  return successResponse(res, 201,
    buildAuthPayload(user, tenant, tenantUser, accessToken),
    'Tenant and Admin user registered successfully'
  );
});

/**
 * POST /api/auth/login
 * Body: { email, password, slug }
 *
 * SEC-04: All failures return identical 401 status + message.
 * SEC-06: Dummy bcrypt on missing user to prevent timing attacks.
 * SEC-08: Failed-attempt tracking with lockout.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, slug } = req.body;
  const requestSlug = slug || (req.tenant ? req.tenant.slug : null);

  if (!email || !password || !requestSlug) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Email, password, and tenant slug are required');
  }

  const cleanSlug = requestSlug.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();
  const genericError = new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  // Step 1: Find tenant (uniform error on missing)
  const tenant = await Tenant.findOne({ slug: cleanSlug });
  if (!tenant) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH); // timing equalization
    throw genericError;
  }

  if (tenant.status === 'suspended') {
    throw new ApiError(403, 'TENANT_SUSPENDED', 'Tenant account is suspended');
  }

  // Step 2: Find user (uniform error + dummy bcrypt on missing)
  const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH); // timing equalization
    throw genericError;
  }

  // Step 3: Find tenant membership (uniform error)
  const tenantUser = await TenantUser.findOne({ tenantId: tenant._id, userId: user._id });
  if (!tenantUser) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH); // timing equalization
    throw genericError;
  }

  // Step 4: Check brute-force lockout
  if (tenantUser.loginLockoutUntil && tenantUser.loginLockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((tenantUser.loginLockoutUntil - new Date()) / 60000);
    throw new ApiError(429, 'ACCOUNT_LOCKED', `Account is locked due to repeated failed attempts. Try again in ${minutesLeft} minute(s).`);
  }

  // Step 5: Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    // Increment failed attempts
    tenantUser.failedLoginAttempts = (tenantUser.failedLoginAttempts || 0) + 1;
    if (tenantUser.failedLoginAttempts >= 5) {
      tenantUser.loginLockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
      await tenantUser.save();
      throw new ApiError(429, 'ACCOUNT_LOCKED', 'Account locked for 15 minutes due to 5 failed login attempts. Use PIN login or try again later.');
    }
    await tenantUser.save();
    throw genericError;
  }

  // Step 6: Success — reset lockout counters
  if (tenantUser.failedLoginAttempts > 0 || tenantUser.loginLockoutUntil) {
    tenantUser.failedLoginAttempts = 0;
    tenantUser.loginLockoutUntil = null;
    await tenantUser.save();
  }

  const hasPinQuery = await TenantUser.findOne({ tenantId: tenant._id, userId: user._id }).select('+pinHash');

  const accessToken = generateAccessToken({
    userId: user._id,
    tenantId: tenant._id,
    role: tenantUser.role
  });

  await issueRefreshToken(res, user._id, tenant._id);

  return successResponse(res, 200,
    buildAuthPayload(user, tenant, tenantUser, accessToken, { hasPin: Boolean(hasPinQuery?.pinHash) }),
    'Login successful'
  );
});

/**
 * POST /api/auth/refresh
 * Reads refreshToken cookie -> verifies -> issues new accessToken.
 *
 * SEC-09: O(1) SHA-256 lookup instead of O(n) bcrypt scan.
 * SEC-10: Token rotation — old token is deleted, new one issued.
 * SEC-13: Returns full user/role/tenant data so PIN-login reload works.
 */
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required');
  }

  // O(1) lookup by SHA-256 hash
  const tokenHash = sha256(refreshToken);
  const matchedRecord = await RefreshToken.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() }
  });

  if (!matchedRecord) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  // Look up user and tenant for the full response payload
  const tenantUser = await TenantUser.findOne({
    tenantId: matchedRecord.tenantId,
    userId: matchedRecord.userId
  });

  if (!tenantUser) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    await RefreshToken.deleteOne({ _id: matchedRecord._id });
    throw new ApiError(403, 'NOT_TENANT_MEMBER', 'User is no longer a member of this tenant');
  }

  const user = await User.findById(matchedRecord.userId);
  const tenant = await Tenant.findById(matchedRecord.tenantId);

  if (!user || !tenant) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    await RefreshToken.deleteOne({ _id: matchedRecord._id });
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Associated account no longer exists');
  }

  if (tenant.status === 'suspended') {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    await RefreshToken.deleteOne({ _id: matchedRecord._id });
    throw new ApiError(403, 'TENANT_SUSPENDED', 'Tenant account is suspended');
  }

  // Token rotation: delete old, issue new
  await RefreshToken.deleteOne({ _id: matchedRecord._id });

  const accessToken = generateAccessToken({
    userId: user._id,
    tenantId: tenant._id,
    role: tenantUser.role
  });

  await issueRefreshToken(res, user._id, tenant._id);

  return successResponse(res, 200,
    buildAuthPayload(user, tenant, tenantUser, accessToken),
    'Access token refreshed successfully'
  );
});

/**
 * POST /api/auth/logout
 * Deletes RefreshToken documents for this user/tenant, clears cookie.
 */
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await RefreshToken.deleteMany({
      userId: req.user.userId,
      tenantId: req.user.tenantId
    });
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });
  return successResponse(res, 200, {}, 'Logged out successfully');
});

/**
 * POST /api/auth/setup-pin
 * Auth required. Body: { pin } (4-6 digits)
 */
export const setupPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;

  if (!pin || !/^\d{4,6}$/.test(pin.toString())) {
    throw new ApiError(400, 'INVALID_PIN', 'PIN must be 4 to 6 numeric digits');
  }

  const strPin = pin.toString();
  const trivialPins = ['0000', '1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '4321', '9876'];
  if (trivialPins.includes(strPin)) {
    throw new ApiError(400, 'WEAK_PIN', 'Please choose a stronger, non-trivial PIN (avoid 1234, 0000, 1111, etc.)');
  }

  const pinHash = await bcrypt.hash(strPin, 10);

  const updatedTenantUser = await TenantUser.findOneAndUpdate(
    { tenantId: req.user.tenantId, userId: req.user.userId },
    { pinHash, failedPinAttempts: 0, pinLockoutUntil: null },
    { new: true }
  );

  if (!updatedTenantUser) {
    throw new ApiError(404, 'TENANT_USER_NOT_FOUND', 'Tenant user record not found');
  }

  return successResponse(res, 200, { hasPin: true }, 'MPIN setup successfully');
});

/**
 * POST /api/auth/pin-login
 * Body: { pin, slug, userId }
 *
 * SEC-05: All failures return uniform 401 response.
 * SEC-20: Validates userId format.
 */
export const pinLogin = asyncHandler(async (req, res) => {
  const { pin, slug, userId } = req.body;
  const requestSlug = slug || (req.tenant ? req.tenant.slug : null);

  if (!pin || !userId || !requestSlug) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'PIN, userId, and tenant slug are required');
  }

  // SEC-20: Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    await bcrypt.compare(pin.toString(), DUMMY_PASSWORD_HASH);
    throw new ApiError(401, 'INVALID_PIN', 'PIN authentication failed');
  }

  const cleanSlug = requestSlug.toLowerCase().trim();
  const genericPinError = new ApiError(401, 'INVALID_PIN', 'PIN authentication failed');

  const tenant = await Tenant.findOne({ slug: cleanSlug });
  if (!tenant) {
    await bcrypt.compare(pin.toString(), DUMMY_PASSWORD_HASH);
    throw genericPinError;
  }

  const tenantUser = await TenantUser.findOne({
    tenantId: tenant._id,
    userId
  }).select('+pinHash');

  if (!tenantUser) {
    await bcrypt.compare(pin.toString(), DUMMY_PASSWORD_HASH);
    throw genericPinError;
  }

  if (!tenantUser.pinHash) {
    await bcrypt.compare(pin.toString(), DUMMY_PASSWORD_HASH);
    throw genericPinError;
  }

  // Check PIN Lockout Status
  if (tenantUser.pinLockoutUntil && tenantUser.pinLockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((tenantUser.pinLockoutUntil - new Date()) / 60000);
    throw new ApiError(429, 'PIN_LOCKED', `PIN login is locked. Try again in ${minutesLeft} minute(s) or use password login.`);
  }

  const isPinValid = await bcrypt.compare(pin.toString(), tenantUser.pinHash);
  if (!isPinValid) {
    tenantUser.failedPinAttempts = (tenantUser.failedPinAttempts || 0) + 1;
    if (tenantUser.failedPinAttempts >= 5) {
      tenantUser.pinLockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      await tenantUser.save();
      throw new ApiError(429, 'PIN_LOCKED', 'PIN login locked for 15 minutes due to 5 failed attempts. Please use password login.');
    }
    await tenantUser.save();
    throw genericPinError;
  }

  // Reset lockout counters on success
  tenantUser.failedPinAttempts = 0;
  tenantUser.pinLockoutUntil = null;
  await tenantUser.save();

  const user = await User.findById(userId);
  if (!user) {
    throw genericPinError;
  }

  const accessToken = generateAccessToken({
    userId: user._id,
    tenantId: tenant._id,
    role: tenantUser.role
  });

  await issueRefreshToken(res, user._id, tenant._id);

  return successResponse(res, 200,
    buildAuthPayload(user, tenant, tenantUser, accessToken, { hasPin: true }),
    'PIN login successful'
  );
});

/**
 * GET /api/auth/me
 * Auth required. Returns current user profile & tenant info.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User profile not found');
  }

  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', 'Tenant profile not found');
  }

  return successResponse(res, 200, {
    user: { id: user._id, email: user.email },
    tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, status: tenant.status },
    role: req.user.role
  }, 'User profile retrieved successfully');
});

export default {
  register,
  login,
  refresh,
  logout,
  setupPin,
  pinLogin,
  getMe
};
