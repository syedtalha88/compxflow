import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, loginUser } from '../api/index.js';
import { useTenant } from './TenantContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { tenantSlug } = useTenant();
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateAuth = (accessToken, userData, userRole, tenantData) => {
    setTokenState(accessToken);
    setAccessToken(accessToken); // Update memory token in API client
    setUser(userData);
    setRole(userRole);
    setTenant(tenantData);
  };

  const clearAuth = () => {
    setTokenState(null);
    setAccessToken(null);
    setUser(null);
    setRole(null);
    setTenant(null);
  };

  // Perform silent refresh on app mount
  useEffect(() => {
    const checkSilentRefresh = async () => {
      setIsLoading(true);
      try {
        const response = await api.post('/auth/refresh', {}, {
          headers: { 'x-tenant-slug': tenantSlug }
        });
        if (response.data?.success && response.data?.data?.accessToken) {
          const { accessToken, user: u, role: r, tenant: t } = response.data.data;
          updateAuth(accessToken, u, r, t);
        }
      } catch (err) {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    checkSilentRefresh();
  }, [tenantSlug]);

  const login = async ({ email, password, slug }) => {
    const targetSlug = slug || tenantSlug;
    const res = await loginUser({ email, password, slug: targetSlug });
    if (res.success && res.data) {
      const { accessToken, user: u, role: r, tenant: t } = res.data;
      updateAuth(accessToken, u, r, t);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  /**
   * loginWithToken — used by PIN login.
   * Accepts the full response data object from /auth/pin-login and sets all auth state.
   */
  const loginWithToken = (data) => {
    const { accessToken, user: u, role: r, tenant: t } = data;
    updateAuth(accessToken, u, r, t);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { 'x-tenant-slug': tenantSlug } });
    } catch (e) {
      console.error('Logout API error:', e);
    } finally {
      clearAuth();
    }
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        accessToken: token,
        user,
        role,
        tenant,
        login,
        loginWithToken,
        logout,
        isAuthenticated,
        isAdmin,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
