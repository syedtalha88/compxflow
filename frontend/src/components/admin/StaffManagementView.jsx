import React, { useState, useEffect } from 'react';
import { createStaffUserApi, fetchStaffUsersApi, deleteStaffUserApi } from '../../api/index.js';
import ConfirmDialog from '../common/ConfirmDialog.jsx';

export function StaffManagementView({ slug = 'kaleem', currentUserId }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    targetId: null
  });

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetchStaffUsersApi(slug);
      if (res.success) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setMsg('');
    setErrorMsg('');

    try {
      const res = await createStaffUserApi({ email, password, role }, slug);
      if (res.success) {
        setMsg(`✓ Staff member '${email}' added to workspace!`);
        setEmail('');
        setPassword('');
        loadStaff();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to add staff member');
    }
  };

  const promptDeleteStaff = (userId, staffEmail) => {
    setConfirmState({
      isOpen: true,
      title: 'Remove Staff Access?',
      message: `Are you sure you want to revoke workspace access for '${staffEmail}'?`,
      targetId: userId
    });
  };

  const handleDeleteStaff = async (userId) => {
    try {
      const res = await deleteStaffUserApi(userId, slug);
      if (res.success) {
        loadStaff();
      }
    } catch (err) {
      setErrorMsg(`Remove failed: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-neutral-card p-6 rounded-[10px] border border-neutral-border shadow-level-1 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="min-w-0 w-full sm:w-auto">
            <h2 className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider truncate">Factory Team & Staff Access</h2>
            <p className="text-[13px] font-bold text-neutral-primary truncate">Manage Factory Workers & Member Accounts</p>
          </div>

          <button onClick={loadStaff} className="text-[13px] text-brand-primary font-semibold hover:underline shrink-0 self-end sm:self-auto">
            🔄 Refresh
          </button>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold rounded-[8px]">
            {msg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[13px] font-semibold rounded-[8px]">
            {errorMsg}
          </div>
        )}

        {/* Add Staff Form */}
        <form onSubmit={handleAddStaff} className="p-4 bg-neutral-bg rounded-[8px] border border-neutral-border space-y-3">
          <span className="text-[12px] font-bold text-neutral-primary uppercase block">+ Add Factory Staff Member</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-secondary mb-1">Staff Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="worker@factory.com"
                className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-secondary mb-1">Initial Password *</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars"
                className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-neutral-border focus:border-brand-primary focus:outline-none bg-white font-mono text-neutral-primary"
                required
              />
            </div>
          </div>

          <div className="flex flex-col justify-between items-stretch pt-2 gap-3">
            <div className="flex items-center gap-2 w-full">
              <label className="text-[11px] font-semibold text-neutral-secondary shrink-0">Role:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex-1 px-2 py-1.5 text-[13px] rounded-[6px] border border-neutral-border font-medium bg-white text-neutral-primary min-w-0"
              >
                <option value="member">Member (Redacted Amounts)</option>
                <option value="admin">Admin (Full Control)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-[13px] font-semibold rounded-[8px] shadow-level-1 transition shrink-0"
            >
              Add Staff Member
            </button>
          </div>
        </form>

        {/* Staff Table */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {loading ? (
            <p className="text-[13px] text-neutral-tertiary py-4 text-center">Loading team members...</p>
          ) : staffList.length === 0 ? (
            <p className="text-[13px] text-neutral-tertiary py-4 text-center italic">No staff members added yet.</p>
          ) : (
            staffList.map(member => (
              <div key={member.id} className="p-3 bg-neutral-bg rounded-[8px] border border-neutral-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[13px]">
                <div className="min-w-0 w-full sm:w-auto">
                  <span className="font-semibold text-neutral-primary block truncate">{member.email}</span>
                  <span className="text-[11px] text-neutral-tertiary block">Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    member.role === 'admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {member.role}
                  </span>

                  {currentUserId !== member.userId && (
                    <button
                      onClick={() => promptDeleteStaff(member.userId, member.email)}
                      className="text-[11px] text-semantic-error-text hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* In-App Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Remove Access"
        onConfirm={() => {
          if (confirmState.targetId) handleDeleteStaff(confirmState.targetId);
          setConfirmState({ ...confirmState, isOpen: false });
        }}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}

export default StaffManagementView;
