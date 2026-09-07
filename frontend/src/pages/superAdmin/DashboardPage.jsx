import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../api/superAdminApi.js';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard()
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(err => {
        if (err.response?.status === 403) {
          navigate('/internal', { replace: true });
        } else {
          setError(err.response?.data?.message || 'Failed to load dashboard');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm font-medium animate-pulse">Loading platform stats…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500 text-sm font-bold">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { tenants, records, recentTenants } = data;

  const tenantStats = [
    { label: 'Total Tenants', value: tenants.total, color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { label: 'Active', value: tenants.active, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Suspended', value: tenants.suspended, color: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'Free Plan', value: tenants.free, color: 'bg-slate-50 text-slate-700 border-slate-200' },
    { label: 'Pro Plan', value: tenants.pro, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  const recordStats = [
    { label: 'Total Invoices', value: records.invoices, icon: '📄' },
    { label: 'Total Purchases', value: records.purchases, icon: '🛒' },
    { label: 'Total Expenses', value: records.expenses, icon: '💸' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Platform Dashboard</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">High-level overview of the entire FactFlow platform</p>
      </div>

      {/* Tenant Stats */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tenants</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {tenantStats.map(stat => (
            <div key={stat.label} className={`px-4 py-4 rounded-xl border ${stat.color} text-center`}>
              <div className="text-2xl font-black">{stat.value}</div>
              <div className="text-[11px] font-bold mt-1 opacity-80">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Record Stats */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Platform Records</h2>
        <div className="grid grid-cols-3 gap-3">
          {recordStats.map(stat => (
            <div key={stat.label} className="px-4 py-5 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black text-slate-900">{stat.value.toLocaleString()}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Registered Tenants */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recently Registered</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {recentTenants.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400 italic">No tenants registered yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Factory</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Slug</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTenants.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/internal/tenants/${t.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-violet-600 font-semibold">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        t.plan === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
