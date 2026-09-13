import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenantSlug, setTenantSlug] = useState(() => {
    // 1. Check subdomain from window.location.hostname
    const host = window.location.hostname;
    const parts = host.split('.');

    // Don't extract subdomain from platform domains (e.g. indigo-eagle-118056.hostingersite.com)
    const platformDomains = ['hostingersite.com', 'herokuapp.com', 'vercel.app', 'netlify.app'];
    const isPlatformDomain = platformDomains.some(pd => host.endsWith(pd));

    if (!isPlatformDomain && parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'app' && parts[0] !== 'kaleem' && parts[0] !== 'localhost') {
      return parts[0].toLowerCase();
    }

    // 2. Check URL query param ?tenant=slug
    const params = new URLSearchParams(window.location.search);
    const paramSlug = params.get('tenant');
    if (paramSlug) return paramSlug.toLowerCase();

    // 3. Check localStorage for remembered tenant
    const saved = localStorage.getItem('factflow_tenant_slug');
    if (saved) return saved;

    // 4. Fallback for local development
    return 'kaleem';
  });

  return (
    <TenantContext.Provider value={{ tenantSlug, setTenantSlug }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export default TenantContext;
