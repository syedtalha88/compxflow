import Tenant from '../models/Tenant.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Platform domains where the first part is NOT a tenant slug
// e.g. indigo-eagle-118056.hostingersite.com → NOT a tenant
const PLATFORM_DOMAINS = ['hostingersite.com', 'herokuapp.com', 'vercel.app', 'netlify.app'];

/**
 * Tenant resolution middleware
 * Resolves tenant from x-tenant-slug header (local dev) or subdomain (prod)
 * Attaches resolved tenant object to req.tenant
 */
export const tenantMiddleware = asyncHandler(async (req, res, next) => {
  // Skip tenant resolution for non-API routes (static files, React SPA)
  if (!req.path.startsWith('/api')) {
    return next();
  }

  // Check for header first (local dev / explicit override)
  let slug = req.headers['x-tenant-slug'];

  // Extract from Host header if no explicit header passed
  if (!slug && req.headers.host) {
    const host = req.headers.host.split(':')[0]; // remove port
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host === 'localhost';
    
    // Check if this is a platform domain (not a tenant subdomain)
    const isPlatformDomain = PLATFORM_DOMAINS.some(pd => host.endsWith(pd));
    
    if (!isIP && !isPlatformDomain) {
      const parts = host.split('.');
      // E.g. kaleem.factflow.app -> parts = ['kaleem', 'factflow', 'app']
      // Avoid resolving localhost or main domain as tenant
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api') {
        slug = parts[0].toLowerCase();
      }
    }
  }

  // If no slug resolved and route is health check or auth/tenant creation, allow proceeding
  const publicPathPrefixes = [
    '/api/health',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/pin-login',
    '/api/tenants/register',
    '/api/tenants/check-slug',
    '/api/admin',
    '/api/super-admin'
  ];
  const isPublicRoute = publicPathPrefixes.some(prefix => req.path.startsWith(prefix));

  if (!slug) {
    if (isPublicRoute) {
      req.tenant = null;
      return next();
    }
    throw new ApiError(400, 'MISSING_TENANT', 'Tenant identifier (subdomain or x-tenant-slug header) is required');
  }

  const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });

  if (!tenant) {
    if (isPublicRoute) {
      req.tenant = null;
      return next();
    }
    throw new ApiError(404, 'TENANT_NOT_FOUND', `Tenant with slug '${slug}' not found`);
  }

  if (tenant.status === 'suspended') {
    throw new ApiError(403, 'TENANT_SUSPENDED', 'Tenant account is suspended');
  }

  req.tenant = {
    id: tenant._id,
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
    status: tenant.status
  };

  next();
});

export default tenantMiddleware;

