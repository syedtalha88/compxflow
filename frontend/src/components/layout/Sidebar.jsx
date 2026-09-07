import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';

// Heroicon SVGs
const icons = {
  Home: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
  Invoices: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
  Purchases: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />,
  Expenses: <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 1 0 0-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  Reports: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />,
  Staff: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />,
  Logout: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
};

export function Sidebar() {
  const { isAuthenticated, isAdmin, user, tenant, role, logout } = useAuth();
  const { tenantSlug } = useTenant();

  if (!isAuthenticated) return null;

  const navItems = [
    { to: '/', label: 'Home Dashboard', iconName: 'Home' },
    { to: '/invoices', label: 'Sales Invoices', iconName: 'Invoices' },
    { to: '/purchases', label: 'Raw Purchases', iconName: 'Purchases' },
    { to: '/expenses', label: 'Operating Expenses', iconName: 'Expenses' },
    ...(isAdmin ? [{ to: '/reports', label: 'Financial Reports', iconName: 'Reports' }] : []),
    ...(isAdmin ? [{ to: '/staff', label: 'Factory Staff', iconName: 'Staff' }] : [])
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-neutral-card border-r border-neutral-border h-screen sticky top-0 shrink-0 z-30 font-sans">
      {/* Brand Header */}
      <div className="p-6 border-b border-neutral-border flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-xl flex items-center justify-center text-xl font-black shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        </div>
        <div className="overflow-hidden">
          <h1 className="text-16px font-black text-neutral-primary leading-tight">FactFlow</h1>
          <p className="text-[12px] text-neutral-secondary font-semibold truncate capitalize mt-0.5">
            {tenant?.name || tenantSlug || 'Factory'}
          </p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-6 py-3 bg-neutral-bg border-b border-neutral-border flex items-center justify-between">
        <span className="text-[12px] font-bold text-neutral-secondary uppercase tracking-wider">Workspace Role</span>
        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-[6px] capitalize ${
          isAdmin ? 'bg-brand-light text-brand-primary' : 'bg-blue-100 text-blue-700'
        }`}>
          {role || 'Member'}
        </span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-[10px] text-[14px] font-medium transition-all ${
                isActive
                  ? 'bg-brand-primary text-white shadow-level-1'
                  : 'text-neutral-secondary hover:bg-neutral-bg hover:text-neutral-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]">
                  {icons[item.iconName]}
                </svg>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-neutral-border bg-neutral-bg space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-light text-brand-primary font-bold flex items-center justify-center text-[14px] shrink-0 uppercase">
            {user?.email ? user.email[0] : 'U'}
          </div>
          <div className="overflow-hidden text-left flex-1">
            <p className="text-[13px] font-bold text-neutral-primary truncate">{user?.email || 'User'}</p>
            <p className="text-[11px] text-neutral-tertiary font-medium truncate">{tenantSlug}.factflow.app</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full h-[44px] text-[14px] font-bold text-semantic-error-text bg-semantic-error-bg hover:bg-red-100 rounded-[10px] transition text-center flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
            {icons.Logout}
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
