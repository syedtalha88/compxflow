import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { fetchExpenses, deleteExpenseApi } from '../../api/index.js';
import CaptureFlow from '../../components/capture/CaptureFlow.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';

export function ExpenseListView() {
  const { isAdmin } = useAuth();
  const { tenantSlug } = useTenant();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    targetId: null
  });

  const loadExpenses = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchExpenses({
        category: categoryFilter,
        search: searchTerm,
        slug: tenantSlug
      });
      if (res.success) {
        setExpenses(res.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load expense records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [categoryFilter, searchTerm, tenantSlug]);

  const promptDeleteExpense = (id, desc) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Expense Record?',
      message: `Are you sure you want to delete this expense record (${desc || 'Expense'})?`,
      targetId: id
    });
  };

  const handleDeleteExpense = async (id) => {
    try {
      const res = await deleteExpenseApi(id, tenantSlug);
      if (res.success) {
        loadExpenses();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const getCategoryBadge = (cat) => {
    const formatted = (cat || 'other').replace('_', ' ').toUpperCase();
    switch (cat) {
      case 'raw_material':
        return <span className="bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold px-2 py-0.5 rounded-[4px]">{formatted}</span>;
      case 'electricity':
      case 'utilities':
        return <span className="bg-semantic-warning-bg text-semantic-warning-text border border-semantic-warning-border text-[10px] font-semibold px-2 py-0.5 rounded-[4px]">{formatted}</span>;
      case 'salary':
      case 'labor':
        return <span className="bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 text-[10px] font-semibold px-2 py-0.5 rounded-[4px]">{formatted}</span>;
      case 'rent':
        return <span className="bg-semantic-error-bg text-semantic-error-text border border-semantic-error-border text-[10px] font-semibold px-2 py-0.5 rounded-[4px]">{formatted}</span>;
      default:
        return <span className="bg-neutral-divider text-neutral-secondary border border-neutral-border text-[10px] font-semibold px-2 py-0.5 rounded-[4px]">{formatted}</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-primary tracking-tight">Expenses</h1>
          <p className="text-[13px] text-neutral-tertiary font-medium">{expenses.length} Records</p>
        </div>

        <button
          onClick={() => setShowCaptureModal(true)}
          className="px-4 py-2 bg-brand-primary text-white text-[14px] font-semibold rounded-[8px] shadow-level-1 flex items-center gap-2 hover:bg-brand-secondary active:scale-[0.97] transition"
        >
          <span>Record Expense</span>
        </button>
      </div>

      {/* Filter Bar */}
      <input
        type="text"
        placeholder="Search description or category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
      />

      <div className="flex gap-2 w-full overflow-x-auto pb-1">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-[13px] font-medium rounded-[8px] border border-neutral-border bg-white focus:border-brand-primary focus:outline-none text-neutral-primary"
        >
          <option value="">All Expense Categories</option>
          <option value="raw_material">Raw Material</option>
          <option value="labor">Labor / Salary</option>
          <option value="salary">Staff Salary</option>
          <option value="rent">Factory Rent</option>
          <option value="electricity">Electricity / Power</option>
          <option value="transport">Transport / Freight</option>
          <option value="maintenance">Maintenance & Repairs</option>
          <option value="utilities">Utilities</option>
          <option value="other">Other Overhead</option>
        </select>
      </div>

      {errorMsg && (
        <div className="p-3 bg-semantic-error-bg border border-semantic-error-border text-semantic-error-text text-[13px] font-medium rounded-[8px] text-center">
          {errorMsg}
        </div>
      )}

      {/* Expense Cards List */}
      <div className="space-y-3">
        {loading ? (
           <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1 space-y-3 animate-pulse">
              <div className="h-4 bg-neutral-divider rounded w-1/4"></div>
              <div className="h-4 bg-neutral-divider rounded w-1/2"></div>
           </div>
        ) : expenses.length === 0 ? (
           <div className="py-12 flex flex-col items-center justify-center text-center">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-[80px] h-[80px] text-neutral-border mb-4">
               <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 1 0 0-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
             </svg>
             <h3 className="text-[15px] font-semibold text-neutral-primary mb-1">No expenses yet</h3>
             <p className="text-[13px] text-neutral-tertiary">Tap the button to record your first expense</p>
           </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp._id}
              className="py-[12px] px-[16px] rounded-[10px] border border-neutral-border bg-neutral-card shadow-level-1"
            >
              <div className="flex justify-between items-start mb-1">
                {getCategoryBadge(exp.category)}
              </div>
              
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <p className="text-[14px] text-neutral-secondary font-medium truncate max-w-[200px] mb-1">{exp.description || 'No description'}</p>
                  <span className="text-[12px] text-neutral-tertiary">{new Date(exp.date || exp.createdAt).toLocaleDateString()}</span>
                </div>

                {isAdmin ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[16px] font-bold text-neutral-primary">₹{exp.amount?.toLocaleString('en-IN') || 0}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {exp.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(exp.imageUrl)}
                          className="text-[12px] text-brand-primary hover:underline font-medium"
                        >
                          View Receipt
                        </button>
                      )}
                      <button onClick={() => promptDeleteExpense(exp._id, exp.description)} className="text-[12px] text-semantic-error-text font-medium hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[12px] text-neutral-tertiary">—</span>
                    {exp.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(exp.imageUrl)}
                        className="text-[12px] text-brand-primary hover:underline font-medium"
                      >
                        View Receipt
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Expanded Image Viewer Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <button
              type="button"
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white font-semibold rounded-full w-10 h-10 flex items-center justify-center text-lg backdrop-blur-md transition"
            >
              ✕
            </button>
            <img src={previewImage} alt="Receipt Photo" className="max-w-full max-h-[85vh] rounded-[10px] object-contain shadow-level-3 border border-white/10" />
            <span className="text-[13px] text-white/70 font-semibold mt-3 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
              Tap anywhere to close
            </span>
          </div>
        </div>
      )}

      {/* Record Expense Modal Overlay */}
      {showCaptureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <CaptureFlow
              type="expense"
              slug={tenantSlug}
              onComplete={() => {
                setShowCaptureModal(false);
                loadExpenses();
              }}
              onCancel={() => setShowCaptureModal(false)}
            />
          </div>
        </div>
      )}

      {/* In-App Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Delete"
        onConfirm={() => {
          if (confirmState.targetId) handleDeleteExpense(confirmState.targetId);
          setConfirmState({ ...confirmState, isOpen: false });
        }}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}

export default ExpenseListView;
