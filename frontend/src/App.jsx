import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import LoginView from './pages/LoginView.jsx';
import HomeView from './pages/HomeView.jsx';
import InvoiceListView from './pages/invoices/InvoiceListView.jsx';
import PurchaseListView from './pages/purchases/PurchaseListView.jsx';
import ExpenseListView from './pages/expenses/ExpenseListView.jsx';
import ReportsView from './pages/reports/ReportsView.jsx';
import StaffManagementView from './components/admin/StaffManagementView.jsx';

// ── Super Admin (completely separate from main app) ──
import KeyEntryPage from './pages/superAdmin/KeyEntryPage.jsx';
import SuperAdminLayout from './pages/superAdmin/SuperAdminLayout.jsx';
import DashboardPage from './pages/superAdmin/DashboardPage.jsx';
import TenantListPage from './pages/superAdmin/TenantListPage.jsx';
import TenantDetailPage from './pages/superAdmin/TenantDetailPage.jsx';

function MainAppLayout() {
  const { user, tenant, role, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

  // Super Admin routes are handled entirely outside of this component
  // by the top-level <Routes> in AppRouter below. This check prevents
  // the main app from trying to render /internal/* paths.
  if (location.pathname.startsWith('/internal')) {
    return null;
  }

  const session = {
    user,
    tenant,
    role
  };

  if (isLoginPage || !isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Responsive Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomeView session={session} onLogout={logout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <InvoiceListView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute>
                  <PurchaseListView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <ExpenseListView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute adminOnly={true}>
                  <ReportsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute adminOnly={true}>
                  <StaffManagementView slug={session.tenant?.slug || 'kaleem'} currentUserId={session.user?.id} />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

function AppRouter() {
  return (
    <Routes>
      {/* ── Super Admin Routes (completely independent) ── */}
      <Route path="/internal">
        <Route index element={<KeyEntryPage />} />
        <Route element={<SuperAdminLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tenants" element={<TenantListPage />} />
          <Route path="tenants/:id" element={<TenantDetailPage />} />
        </Route>
      </Route>

      {/* ── Main Factory App ── */}
      <Route path="*" element={<MainAppLayout />} />
    </Routes>
  );
}

import { Toaster } from 'react-hot-toast';

export function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="bottom-center" />
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;
