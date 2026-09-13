import axios from 'axios';
import toast from 'react-hot-toast';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

// Store access token in memory (never localStorage!)
let memoryAccessToken = null;

export const setAccessToken = (token) => {
  memoryAccessToken = token;
};

export const getAccessToken = () => memoryAccessToken;

// Request interceptor: add auth token & dynamic tenant slug header for local dev / IP testing
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();

    if (memoryAccessToken) {
      config.headers['Authorization'] = `Bearer ${memoryAccessToken}`;
    }

    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname === 'localhost' || hostname === '127.0.0.1';

    if (!config.headers['x-tenant-slug']) {
      // Don't extract subdomain from platform domains
      const platformDomains = ['hostingersite.com', 'herokuapp.com', 'vercel.app', 'netlify.app'];
      const isPlatformDomain = platformDomains.some(pd => hostname.endsWith(pd));

      if (!isIP && !isPlatformDomain) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'app' && parts[0] !== 'kaleem') {
          config.headers['x-tenant-slug'] = parts[0].toLowerCase();
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: silent token refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await api.post('/auth/refresh');
        if (refreshRes.data?.data?.accessToken) {
          setAccessToken(refreshRes.data.data.accessToken);
          originalRequest.headers['Authorization'] = `Bearer ${refreshRes.data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        setAccessToken(null);
        toast.error('Session expired. Please log in again.');
      }
    } else if (error.response?.status !== 401) {
      // Show generic toast for other API errors
      const msg = error.response?.data?.message || 'An unexpected error occurred';
      if (!originalRequest.url?.includes('/health') && !originalRequest.url?.includes('/tenants/check-slug')) {
        toast.error(msg);
      }
    }
    return Promise.reject(error);
  }
);

export const checkHealth = async (slug = 'kaleem') => {
  const response = await api.get('/health', { headers: { 'x-tenant-slug': slug } });
  return response.data;
};

export const loginUser = async ({ email, password, slug }) => {
  const response = await api.post('/auth/login', { email, password, slug }, {
    headers: { 'x-tenant-slug': slug }
  });
  if (response.data?.data?.accessToken) {
    setAccessToken(response.data.data.accessToken);
  }
  return response.data;
};

export const registerTenant = async ({ tenantName, slug, email, password }) => {
  const response = await api.post('/auth/register', { tenantName, slug, email, password });
  if (response.data?.data?.accessToken) {
    setAccessToken(response.data.data.accessToken);
  }
  return response.data;
};

export const setupPinApi = async (pin, slug = 'kaleem') => {
  const response = await api.post('/auth/setup-pin', { pin }, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const extractOcr = async (file, type = 'invoice', slug = 'kaleem') => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', type);

  const response = await api.post('/ocr/extract', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-tenant-slug': slug
    }
  });

  return response.data;
};

// ── Phase 4: Invoice & Payment API functions ──────────────────────────────────────────

export const fetchInvoices = async ({ status = '', search = '', startDate = '', endDate = '', page = 1, limit = 20, slug = 'kaleem' } = {}) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const response = await api.get(`/invoices?${params.toString()}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const createInvoiceApi = async (invoiceData, slug = 'kaleem') => {
  const response = await api.post('/invoices', invoiceData, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const fetchInvoiceById = async (id, slug = 'kaleem') => {
  const response = await api.get(`/invoices/${id}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const deleteInvoiceApi = async (id, slug = 'kaleem') => {
  const response = await api.delete(`/invoices/${id}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const createPaymentApi = async (paymentData, slug = 'kaleem') => {
  const response = await api.post('/payments', paymentData, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const deletePaymentApi = async (id, slug = 'kaleem') => {
  const response = await api.delete(`/payments/${id}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

// ── Phase 5: Purchase & Expense API functions ────────────────────────────────────────

export const fetchPurchases = async ({ status = '', search = '', startDate = '', endDate = '', page = 1, limit = 20, slug = 'kaleem' } = {}) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const response = await api.get(`/purchases?${params.toString()}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const createPurchaseApi = async (purchaseData, slug = 'kaleem') => {
  const response = await api.post('/purchases', purchaseData, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const fetchPurchaseById = async (id, slug = 'kaleem') => {
  const response = await api.get(`/purchases/${id}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const deletePurchaseApi = async (id, slug = 'kaleem') => {
  const response = await api.delete(`/purchases/${id}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const createPurchasePaymentApi = async (paymentData, slug = 'kaleem') => {
  const response = await api.post('/purchase-payments', paymentData, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const deletePurchasePaymentApi = async (id, slug = 'kaleem') => {
  const response = await api.delete(`/purchase-payments/${id}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const fetchExpenses = async ({ category = '', search = '', startDate = '', endDate = '', page = 1, limit = 20, slug = 'kaleem' } = {}) => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const response = await api.get(`/expenses?${params.toString()}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const createExpenseApi = async (expenseData, slug = 'kaleem') => {
  const response = await api.post('/expenses', expenseData, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const deleteExpenseApi = async (id, slug = 'kaleem') => {
  const response = await api.delete(`/expenses/${id}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

// ── Phase 6: Reports & Export API functions ──────────────────────────────────────────

export const fetchDayReport = async (dateStr, slug = 'kaleem') => {
  const response = await api.get(`/reports/day?date=${dateStr}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const fetchMonthReport = async (monthStr, slug = 'kaleem') => {
  const response = await api.get(`/reports/month?month=${monthStr}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const fetchRangeReport = async (startDate, endDate, slug = 'kaleem') => {
  const response = await api.get(`/reports/range?startDate=${startDate}&endDate=${endDate}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const downloadReportPdf = async (options = {}, slug = 'kaleem') => {
  let queryStr = '';
  let filenameDate = 'Report';

  if (typeof options === 'string') {
    queryStr = `date=${options}`;
    filenameDate = options;
  } else {
    const params = new URLSearchParams();
    if (options.date) { params.append('date', options.date); filenameDate = options.date; }
    else if (options.month) { params.append('month', options.month); filenameDate = options.month; }
    else if (options.startDate && options.endDate) {
      params.append('startDate', options.startDate);
      params.append('endDate', options.endDate);
      filenameDate = `${options.startDate}_to_${options.endDate}`;
    }
    if (options.slug) slug = options.slug;
    queryStr = params.toString();
  }

  const response = await api.get(`/reports/export/pdf?${queryStr}`, {
    headers: { 'x-tenant-slug': slug },
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FactFlow_Report_${filenameDate}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export const downloadReportExcel = async (options = {}, slug = 'kaleem') => {
  let queryStr = '';
  let filenameDate = 'Report';

  if (typeof options === 'string') {
    queryStr = `date=${options}`;
    filenameDate = options;
  } else {
    const params = new URLSearchParams();
    if (options.date) { params.append('date', options.date); filenameDate = options.date; }
    else if (options.month) { params.append('month', options.month); filenameDate = options.month; }
    else if (options.startDate && options.endDate) {
      params.append('startDate', options.startDate);
      params.append('endDate', options.endDate);
      filenameDate = `${options.startDate}_to_${options.endDate}`;
    }
    if (options.slug) slug = options.slug;
    queryStr = params.toString();
  }

  const response = await api.get(`/reports/export/excel?${queryStr}`, {
    headers: { 'x-tenant-slug': slug },
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FactFlow_Report_${filenameDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// ── Phase 7: Factory User Management API functions ─────────────────────

export const createStaffUserApi = async (userData, slug = 'kaleem') => {
  const response = await api.post('/tenant-admin/users', userData, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const fetchStaffUsersApi = async (slug = 'kaleem') => {
  const response = await api.get('/tenant-admin/users', {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export const deleteStaffUserApi = async (userId, slug = 'kaleem') => {
  const response = await api.delete(`/tenant-admin/users/${userId}`, {
    headers: { 'x-tenant-slug': slug }
  });
  return response.data;
};

export default api;
