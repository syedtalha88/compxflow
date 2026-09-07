import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTenantDetail, updateTenant, deleteTenant } from '../../api/superAdminApi.js';

export default function TenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchDetail = useCallback(async () => {
    try {
      const res = await getTenantDetail(id);
      if (res.success) setData(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/internal', { replace: true });
      } else {
        setError(err.response?.data?.message || 'Failed to load tenant');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleStatusChange = async (newStatus) => {
    setActionLoading('status');
    setActionMsg('');
    try {
      await updateTenant(id, { status: newStatus });
      setActionMsg(`Tenant ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      fetchDetail();
    } catch (err) {
      setActionMsg(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading('');
    }
  };

  const handlePlanChange = async (newPlan) => {
    setActionLoading('plan');
    setActionMsg('');
    try {
      await updateTenant(id, { plan: newPlan });
      setActionMsg(`Plan changed to ${newPlan} successfully`);
      fetchDetail();
    } catch (err) {
      setActionMsg(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteTenant(id, data.tenant.slug);
      navigate('/internal/tenants', { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm font-medium animate-pulse">Loading tenant detail…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-red-500 text-sm font-bold">{error}</p>
        <button onClick={() => navigate('/internal/tenants')} className="text-sm text-violet-600 font-bold hover:underline">
          ← Back to tenants
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { tenant, users, counts, monthlyActivity, recentInvoices } = data;

  return (
    <div className="space-y-8">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate('/internal/tenants')} className="text-sm text-violet-600 font-bold hover:underline mb-3 inline-block">
          ← All Tenants
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{tenant.name}</h1>
            <p className="text-sm text-violet-600 font-semibold mt-0.5">{tenant.slug}.factflow.app</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              tenant.plan === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {tenant.plan.toUpperCase()}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {tenant.status}
            </span>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-bold ${
          actionMsg.startsWith('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {actionMsg}
        </div>
      )}

      {/* Core Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tenant Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">MongoDB ID</span>
            <span className="font-mono text-xs text-slate-700 break-all">{tenant.id}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Factory Name</span>
            <span className="font-bold text-slate-900">{tenant.name}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Slug</span>
            <span className="font-semibold text-violet-600">{tenant.slug}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Plan</span>
            <span className="font-bold text-slate-900 capitalize">{tenant.plan}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Status</span>
            <span className={`font-bold capitalize ${tenant.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>{tenant.status}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Registered</span>
            <span className="font-semibold text-slate-700">{new Date(tenant.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Users ({users.length})</h2>
        </div>
        {users.length === 0 ? (
          <p className="p-5 text-sm text-slate-400 italic">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-5 py-2.5 font-semibold text-slate-900">{u.email}</td>
                  <td className="px-5 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Counts */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Record Counts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Invoices', value: counts.invoices, icon: '📄' },
            { label: 'Purchases', value: counts.purchases, icon: '🛒' },
            { label: 'Expenses', value: counts.expenses, icon: '💸' },
            { label: 'OCR Jobs', value: counts.ocrJobs, icon: '🔍' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 text-center">
              <div className="text-xl mb-1">{c.icon}</div>
              <div className="text-xl font-black text-slate-900">{c.value.toLocaleString()}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Invoice Activity (Last 6 Months)</h2>
        </div>
        {monthlyActivity.length === 0 ? (
          <p className="p-5 text-sm text-slate-400 italic">No invoice activity in the last 6 months.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoices Created</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthlyActivity.map(m => (
                <tr key={m.label}>
                  <td className="px-5 py-2.5 font-semibold text-slate-900">{m.label}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-slate-700">{m.invoiceCount}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-emerald-600">₹{m.totalValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Invoices (Last 5)</h2>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="p-5 text-sm text-slate-400 italic">No invoices found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bill No</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentInvoices.map(inv => (
                <tr key={inv.id}>
                  <td className="px-5 py-2.5 font-bold text-slate-900">{inv.billNo}</td>
                  <td className="px-5 py-2.5 font-semibold text-slate-700">{inv.customerName}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                  <td className="px-5 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'partially_paid' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-red-50 border-b border-red-200">
          <h2 className="text-xs font-bold text-red-600 uppercase tracking-wider">⚠️ Danger Zone</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Suspend / Activate */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {tenant.status === 'active' ? 'Suspend this tenant' : 'Activate this tenant'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {tenant.status === 'active'
                  ? 'Immediately blocks all API access for this factory\'s staff.'
                  : 'Restores full access. No data is lost during suspension.'}
              </p>
            </div>
            <button
              onClick={() => handleStatusChange(tenant.status === 'active' ? 'suspended' : 'active')}
              disabled={actionLoading === 'status'}
              className={`px-5 py-2 text-sm font-bold rounded-xl transition shrink-0 ${
                tenant.status === 'active'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
              }`}
            >
              {actionLoading === 'status' ? 'Updating…' : (tenant.status === 'active' ? 'Suspend' : 'Activate')}
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Change Plan */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Change plan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Currently on <strong>{tenant.plan}</strong> plan.</p>
            </div>
            <button
              onClick={() => handlePlanChange(tenant.plan === 'free' ? 'pro' : 'free')}
              disabled={actionLoading === 'plan'}
              className="px-5 py-2 text-sm font-bold rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition shrink-0"
            >
              {actionLoading === 'plan' ? 'Updating…' : `Switch to ${tenant.plan === 'free' ? 'Pro' : 'Free'}`}
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Permanent Delete */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-700">Permanently delete this tenant</h3>
              <p className="text-xs text-slate-500 mt-0.5">Removes all data, invoices, purchases, images. Cannot be undone.</p>
            </div>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirmSlug(''); setDeleteError(''); }}
              className="px-5 py-2 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 transition shrink-0"
            >
              Delete Tenant
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-3">
                <span className="text-3xl">🗑️</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">Delete {tenant.name}?</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This will permanently delete the tenant, all their invoices, purchases, expenses, payments, OCR jobs, and all images stored in Cloudinary for this tenant. <strong className="text-red-600">This cannot be undone.</strong>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Type <span className="text-red-600 font-mono">{tenant.slug}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmSlug}
                onChange={e => setDeleteConfirmSlug(e.target.value)}
                placeholder={tenant.slug}
                autoComplete="off"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
              />
            </div>

            {deleteError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmSlug !== tenant.slug || deleteLoading}
                className="flex-[2] py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition"
              >
                {deleteLoading ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
