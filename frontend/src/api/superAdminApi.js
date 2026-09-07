import axios from 'axios';

/**
 * Super Admin API — Completely separate from the main app's API layer.
 * 
 * - No JWT tokens, no withCredentials, no tenant slug headers.
 * - Authenticates via x-super-admin-key header only.
 * - Key is stored in sessionStorage (auto-clears when tab closes).
 */

const SESSION_KEY = 'sa_key';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

const saApi = axios.create({
  baseURL: getApiBaseUrl(),
});

// Request interceptor: attach the super admin key from sessionStorage
saApi.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const key = sessionStorage.getItem(SESSION_KEY);
  if (key) {
    config.headers['x-super-admin-key'] = key;
  }
  return config;
});

// ── Auth helpers ──

export const setSuperAdminKey = (key) => {
  sessionStorage.setItem(SESSION_KEY, key);
};

export const getSuperAdminKey = () => {
  return sessionStorage.getItem(SESSION_KEY);
};

export const clearSuperAdminKey = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

// ── API functions ──

export const getDashboard = async () => {
  const res = await saApi.get('/super-admin/dashboard');
  return res.data;
};

export const listTenants = async ({ search = '', status = '', plan = '', page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (plan) params.append('plan', plan);
  params.append('page', page);
  params.append('limit', limit);

  const res = await saApi.get(`/super-admin/tenants?${params.toString()}`);
  return res.data;
};

export const getTenantDetail = async (id) => {
  const res = await saApi.get(`/super-admin/tenants/${id}`);
  return res.data;
};

export const createTenant = async ({ tenantName, slug, adminEmail, adminPassword }) => {
  const res = await saApi.post('/super-admin/tenants', { tenantName, slug, adminEmail, adminPassword });
  return res.data;
};

export const updateTenant = async (id, { status, plan }) => {
  const body = {};
  if (status) body.status = status;
  if (plan) body.plan = plan;
  const res = await saApi.put(`/super-admin/tenants/${id}`, body);
  return res.data;
};

export const deleteTenant = async (id, slug) => {
  const res = await saApi.delete(`/super-admin/tenants/${id}`, {
    headers: { 'x-confirm-delete': slug }
  });
  return res.data;
};

export default {
  setSuperAdminKey,
  getSuperAdminKey,
  clearSuperAdminKey,
  getDashboard,
  listTenants,
  getTenantDetail,
  createTenant,
  updateTenant,
  deleteTenant
};
