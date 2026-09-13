import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getSuperAdminKey, clearSuperAdminKey } from '../../api/superAdminApi.js';

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Guard: if no key in session, redirect to key entry
  useEffect(() => {
    if (!getSuperAdminKey()) {
      navigate('/internal', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    clearSuperAdminKey();
    navigate('/internal', { replace: true });
  };

  const navItems = [
    { to: '/internal/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/internal/tenants', label: 'Tenants', icon: '🏭' },
  ];

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* ── Dark Sidebar ── */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-tight">CompXFlow</h1>
              <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Internal Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-all duration-200"
          >
            <span>🚪</span>
            <span>Lock Panel</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
