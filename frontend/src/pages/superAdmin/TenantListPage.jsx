import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTenants, createTenant } from '../../api/superAdminApi.js';

export default function TenantListPage() {
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showProvision, setShowProvision] = useState(false);
  const navigate = useNavigate();

  // Provision form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await listTenants({ search, status: statusFilter, plan: planFilter, page, limit: 20 });
      if (res.success) {
        setTenants(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/internal', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter, navigate]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchData(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const handleProvision = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);
    try {
      const res = await createTenant({
        tenantName: formName,
        slug: formSlug,
        adminEmail: formEmail,
        adminPassword: formPassword
      });
      if (res.success) {
        setFormSuccess(`Factory '${formName}' provisioned! Admin: ${formEmail}`);
        setFormName('');
        setFormSlug('');
        setFormEmail('');
        setFormPassword('');
        setShowProvision(false);
        fetchData(1);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Provisioning failed');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">All Tenants</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {pagination.total} {pagination.total === 1 ? 'factory' : 'factories'} registered
          </p>
        </div>
        <button
          onClick={() => { setShowProvision(true); setFormError(''); setFormSuccess(''); }}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-violet-600/20 shrink-0"
        >
          + Provision Factory
        </button>
      </div>

      {/* Success Message */}
      {formSuccess && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-bold">
          ✓ {formSuccess}
        </div>
      )}

      {/* Provision Modal */}
      {showProvision && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowProvision(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Provision New Factory</h2>
              <button onClick={() => setShowProvision(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleProvision} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Factory Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Royal Woodworks"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:outline-none font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subdomain Slug</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formSlug}
                    onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="royal-wood"
                    className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:outline-none font-bold lowercase"
                    required
                  />
                  <span className="text-xs text-slate-400 font-semibold shrink-0">.factflow.app</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="admin@factory.com"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              {formError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProvision(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="flex-[2] py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition">
                  {formLoading ? 'Provisioning…' : '💾 Provision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or slug…"
          className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-medium"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-semibold text-slate-700 min-w-[140px]"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-semibold text-slate-700 min-w-[120px]"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading tenants…</p>
        ) : tenants.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400 italic">No tenants match your criteria.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Factory</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoices</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map(t => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/internal/tenants/${t.id}`)}
                  className="hover:bg-violet-50/50 cursor-pointer transition"
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
                  <td className="px-4 py-3 text-right font-bold text-slate-700">{t.invoices}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchData(pagination.page - 1)}
              className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchData(pagination.page + 1)}
              className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
