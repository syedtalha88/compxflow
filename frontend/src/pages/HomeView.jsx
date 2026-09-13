import React, { useState, useEffect } from 'react';
import {
  fetchInvoices,
  fetchInvoiceById,
  deleteInvoiceApi,
  deletePaymentApi,
  fetchPurchases,
  fetchPurchaseById,
  deletePurchaseApi,
  deletePurchasePaymentApi,
  fetchExpenses,
  deleteExpenseApi
} from '../api/index.js';
import CaptureFlow from '../components/capture/CaptureFlow.jsx';
import ReportsView from '../components/reports/ReportsView.jsx';
import StaffManagementView from '../components/admin/StaffManagementView.jsx';
import InvoiceDetailModal from '../components/invoices/InvoiceDetailModal.jsx';
import PurchaseDetailModal from '../components/purchases/PurchaseDetailModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

export function HomeView({ session, onLogout }) {
  // Main Tab State: 'invoices' | 'purchases' | 'expenses' | 'reports' | 'staff'
  const [activeTab, setActiveTab] = useState('invoices');

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [invStatusFilter, setInvStatusFilter] = useState('');
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Purchases State
  const [purchases, setPurchases] = useState([]);
  const [purStatusFilter, setPurStatusFilter] = useState('');
  const [purSearchTerm, setPurSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Expenses State
  const [expenses, setExpenses] = useState([]);
  const [expCategoryFilter, setExpCategoryFilter] = useState('');
  const [expSearchTerm, setExpSearchTerm] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [loading, setLoading] = useState(false);
  const [captureType, setCaptureType] = useState(null); // 'invoice' | 'payment' | 'purchase' | 'purchase_payment' | 'expense'
  const [previewImage, setPreviewImage] = useState(null);

  const slug = session.tenant?.slug || 'kaleem';
  const role = session.role || 'admin';
  const isAdmin = role === 'admin';

  // Compute Today's Date String for filtering
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;

  // Load Invoices
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetchInvoices({ status: invStatusFilter, search: invSearchTerm, startDate: todayDateStr, endDate: todayDateStr, slug });
      if (res.success) setInvoices(res.data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Purchases
  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetchPurchases({ status: purStatusFilter, search: purSearchTerm, startDate: todayDateStr, endDate: todayDateStr, slug });
      if (res.success) setPurchases(res.data);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Expenses
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetchExpenses({ category: expCategoryFilter, search: expSearchTerm, startDate: todayDateStr, endDate: todayDateStr, slug });
      if (res.success) setExpenses(res.data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices();
    else if (activeTab === 'purchases') loadPurchases();
    else if (activeTab === 'expenses') loadExpenses();
  }, [activeTab, invStatusFilter, invSearchTerm, purStatusFilter, purSearchTerm, expCategoryFilter, expSearchTerm]);

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Handlers for Invoices
  const handleSelectInvoice = async (id) => {
    setSelectedInvoice(null);
    try {
      const res = await fetchInvoiceById(id, slug);
      if (res.success) setSelectedInvoice(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      const res = await deleteInvoiceApi(id, slug);
      if (res.success) {
        setSelectedInvoice(null);
        loadInvoices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      const res = await deletePaymentApi(paymentId, slug);
      if (res.success) {
        if (selectedInvoice) handleSelectInvoice(selectedInvoice._id);
        loadInvoices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Purchases
  const handleSelectPurchase = async (id) => {
    setSelectedPurchase(null);
    try {
      const res = await fetchPurchaseById(id, slug);
      if (res.success) setSelectedPurchase(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePurchase = async (id) => {
    try {
      const res = await deletePurchaseApi(id, slug);
      if (res.success) {
        setSelectedPurchase(null);
        loadPurchases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePurchasePayment = async (paymentId) => {
    try {
      const res = await deletePurchasePaymentApi(paymentId, slug);
      if (res.success) {
        if (selectedPurchase) handleSelectPurchase(selectedPurchase._id);
        loadPurchases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handlers for Expenses
  const promptDeleteExpense = (id, desc) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Expense Record?',
      message: `Are you sure you want to delete this expense record (${desc || 'Expense'})?`,
      onConfirm: () => handleDeleteExpense(id)
    });
  };

  const handleDeleteExpense = async (id) => {
    try {
      const res = await deleteExpenseApi(id, slug);
      if (res.success) {
        setSelectedExpense(null);
        loadExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Computed Summary Totals
  const invoiceTotals = invoices.reduce((acc, inv) => {
    acc.total += inv.totalAmount || 0;
    acc.received += inv.amountReceived || 0;
    acc.pending += inv.amountPending || 0;
    return acc;
  }, { total: 0, received: 0, pending: 0 });

  const purchaseTotals = purchases.reduce((acc, pur) => {
    acc.total += pur.totalAmount || 0;
    acc.paid += pur.amountPaid || 0;
    acc.pending += pur.amountPending || 0;
    return acc;
  }, { total: 0, paid: 0, pending: 0 });

  const expenseTotals = expenses.reduce((acc, exp) => {
    acc.total += exp.amount || 0;
    return acc;
  }, { total: 0 });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">Paid</span>;
      case 'partially_paid':
        return <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">Partial</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">Pending</span>;
    }
  };

  const getCategoryBadge = (cat) => {
    const formatLabel = cat.replace('_', ' ').toUpperCase();
    switch (cat) {
      case 'raw_material':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">{formatLabel}</span>;
      case 'electricity':
      case 'utilities':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">{formatLabel}</span>;
      case 'salary':
      case 'labor':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">{formatLabel}</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">{formatLabel}</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto font-sans space-y-6">
      {/* Top Header - Mobile Only */}
      <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1 flex justify-between items-center md:hidden">
        <div className="flex flex-col">
          <h1 className="text-[18px] font-semibold text-neutral-primary truncate tracking-tight">CompXFlow</h1>
          <span className="text-[13px] font-medium text-neutral-tertiary truncate">{session.tenant?.name || 'Factory'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="text-[13px] text-brand-primary font-medium hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Date Display */}
      <div className="px-1 -mt-2 mb-2">
        <span className="text-[13px] font-medium text-neutral-tertiary">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Desktop Dashboard Welcome Banner */}
      <div className="hidden md:flex items-center justify-between bg-neutral-card p-6 rounded-[10px] border border-neutral-border shadow-level-1">
        <div>
          <h1 className="text-[24px] font-bold text-neutral-primary tracking-tight">CompXFlow</h1>
          <p className="text-[14px] text-neutral-tertiary font-medium">{session.tenant?.name || 'Factory'}</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[13px] text-neutral-secondary font-medium">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Quick Capture CTA Buttons */}
        <div className="bg-transparent mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <button
              onClick={() => setCaptureType('invoice')}
              className="p-4 bg-blue-50 border border-blue-100 rounded-[10px] shadow-level-1 hover:shadow-level-2 hover:bg-blue-100 transition text-center flex flex-col justify-center min-h-[110px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[32px] h-[32px] text-blue-600 mx-auto mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="text-[14px] font-semibold text-blue-900">New Invoice</span>
            </button>

            <button
              onClick={() => setCaptureType('payment')}
              className="p-4 bg-emerald-50 border border-emerald-100 rounded-[10px] shadow-level-1 hover:shadow-level-2 hover:bg-emerald-100 transition text-center flex flex-col justify-center min-h-[110px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[32px] h-[32px] text-emerald-600 mx-auto mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[14px] font-semibold text-emerald-900">Add Payment</span>
            </button>

            <button
              onClick={() => setCaptureType('purchase')}
              className="p-4 bg-purple-50 border border-purple-100 rounded-[10px] shadow-level-1 hover:shadow-level-2 hover:bg-purple-100 transition text-center flex flex-col justify-center min-h-[110px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[32px] h-[32px] text-purple-600 mx-auto mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              <span className="text-[14px] font-semibold text-purple-900">New Purchase</span>
            </button>

            <button
              onClick={() => setCaptureType('purchase_payment')}
              className="p-4 bg-amber-50 border border-amber-100 rounded-[10px] shadow-level-1 hover:shadow-level-2 hover:bg-amber-100 transition text-center flex flex-col justify-center min-h-[110px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[32px] h-[32px] text-amber-600 mx-auto mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <span className="text-[14px] font-semibold text-amber-900">Supplier Pay</span>
            </button>

            <button
              onClick={() => setCaptureType('expense')}
              className="col-span-2 md:col-span-4 lg:col-span-1 p-4 bg-rose-50 border border-rose-100 rounded-[10px] shadow-level-1 hover:shadow-level-2 hover:bg-rose-100 transition text-center flex flex-col justify-center min-h-[110px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[32px] h-[32px] text-rose-600 mx-auto mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 1 0 0-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-[14px] font-semibold text-rose-900">New Expense</span>
            </button>
          </div>
        </div>

        {/* Capture Flow Modal Overlay */}
        {captureType && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <CaptureFlow
                type={captureType}
                slug={slug}
                onComplete={() => {
                  setCaptureType(null);
                  if (activeTab === 'invoices') loadInvoices();
                  else if (activeTab === 'purchases') loadPurchases();
                  else if (activeTab === 'expenses') loadExpenses();
                }}
                onCancel={() => setCaptureType(null)}
              />
            </div>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex border border-neutral-border bg-neutral-card rounded-[10px] p-1 shadow-level-1 text-[13px] font-semibold">
          <button
            onClick={() => { setActiveTab('invoices'); setSelectedInvoice(null); }}
            className={`flex-1 py-2 rounded-[8px] transition ${
              activeTab === 'invoices' ? 'bg-brand-primary text-white shadow-level-1' : 'text-neutral-secondary hover:text-neutral-primary hover:bg-neutral-bg'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => { setActiveTab('purchases'); setSelectedPurchase(null); }}
            className={`flex-1 py-2 rounded-[8px] transition ${
              activeTab === 'purchases' ? 'bg-brand-primary text-white shadow-level-1' : 'text-neutral-secondary hover:text-neutral-primary hover:bg-neutral-bg'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => { setActiveTab('expenses'); setSelectedExpense(null); }}
            className={`flex-1 py-2 rounded-[8px] transition ${
              activeTab === 'expenses' ? 'bg-brand-primary text-white shadow-level-1' : 'text-neutral-secondary hover:text-neutral-primary hover:bg-neutral-bg'
            }`}
          >
            Expenses
          </button>
          {/*
          <button
            onClick={() => { setActiveTab('receipts'); }}
            className={`flex-1 py-2 rounded-[8px] transition ${
              activeTab === 'receipts' ? 'bg-brand-primary text-white shadow-level-1' : 'text-neutral-secondary hover:text-neutral-primary hover:bg-neutral-bg'
            }`}
          >
            Receipts
          </button>
          */}
        </div>

        {/* ── TAB 1: INVOICES ───────────────────────────────────────────────── */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {isAdmin ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Invoiced</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">₹{invoiceTotals.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Received</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">₹{invoiceTotals.received.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Pending</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">₹{invoiceTotals.pending.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1 flex flex-col justify-center">
                   <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Records</span>
                   <span className="text-[24px] font-bold text-neutral-primary block mt-1">{invoices.length}</span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-between items-center">
              <h3 className="text-[13px] font-semibold text-neutral-primary uppercase tracking-wider">
                Today's Invoices
              </h3>
              <button onClick={loadInvoices} className="text-[13px] text-brand-primary font-medium hover:underline">
                Refresh
              </button>
            </div>

            <input
              type="text"
              placeholder="Search bill number or customer..."
              value={invSearchTerm}
              onChange={(e) => setInvSearchTerm(e.target.value)}
              className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Partial', value: 'partially_paid' }, { label: 'Paid', value: 'paid' }].map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setInvStatusFilter(chip.value)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition whitespace-nowrap border-[1.5px] ${
                    invStatusFilter === chip.value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-transparent text-brand-primary border-brand-primary hover:bg-brand-light'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pb-32">
              {loading ? (
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1 space-y-3 animate-pulse">
                   <div className="h-4 bg-neutral-divider rounded w-1/4"></div>
                   <div className="h-4 bg-neutral-divider rounded w-1/2"></div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-[80px] h-[80px] text-neutral-border mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <h3 className="text-[15px] font-semibold text-neutral-primary mb-1">No invoices yet</h3>
                  <p className="text-[13px] text-neutral-tertiary">Tap the camera button to capture your first invoice</p>
                </div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv._id}
                    onClick={() => handleSelectInvoice(inv._id)}
                    className={`py-[12px] px-[16px] rounded-[10px] border transition cursor-pointer bg-neutral-card shadow-level-1 ${
                      selectedInvoice?._id === inv._id ? 'border-brand-primary' : 'border-neutral-border hover:border-brand-primary/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[15px] font-semibold text-neutral-primary">#{inv.billNo}</span>
                      {getStatusBadge(inv.status)}
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[14px] text-neutral-secondary truncate max-w-[200px] mb-1">{inv.customerName}</span>
                        <span className="text-[12px] text-neutral-tertiary">{new Date(inv.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {isAdmin && inv.totalAmount !== undefined ? (
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[16px] font-bold text-neutral-primary">₹{inv.totalAmount.toLocaleString('en-IN')}</span>
                          {(inv.amountPending > 0) && (
                            <span className="text-[12px] text-semantic-warning-text font-medium mt-0.5">Pending ₹{inv.amountPending.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                            <span className="text-[12px] text-neutral-tertiary">—</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Invoice Details Popup Modal */}
            {selectedInvoice && (
              <InvoiceDetailModal
                invoice={selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                onDeleteInvoice={handleDeleteInvoice}
                onDeletePayment={handleDeletePayment}
                isAdmin={isAdmin}
              />
            )}
          </div>
        )}

        {/* ── TAB 2: PURCHASES ──────────────────────────────────────────────── */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            {isAdmin ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Total Spend</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">₹{purchaseTotals.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Paid</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">₹{purchaseTotals.paid.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Pending</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">₹{purchaseTotals.pending.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1 flex flex-col justify-center">
                   <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Records</span>
                   <span className="text-[24px] font-bold text-neutral-primary block mt-1">{purchases.length}</span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-between items-center">
              <h3 className="text-[13px] font-semibold text-neutral-primary uppercase tracking-wider">
                Today's Supplier Purchases
              </h3>
              <button onClick={loadPurchases} className="text-[13px] text-brand-primary font-medium hover:underline">
                Refresh
              </button>
            </div>

            <input
              type="text"
              placeholder="Search purchase bill or supplier..."
              value={purSearchTerm}
              onChange={(e) => setPurSearchTerm(e.target.value)}
              className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Partial', value: 'partially_paid' }, { label: 'Paid', value: 'paid' }].map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setPurStatusFilter(chip.value)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition whitespace-nowrap border-[1.5px] ${
                    purStatusFilter === chip.value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-transparent text-brand-primary border-brand-primary hover:bg-brand-light'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pb-32">
              {loading ? (
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1 space-y-3 animate-pulse">
                   <div className="h-4 bg-neutral-divider rounded w-1/4"></div>
                   <div className="h-4 bg-neutral-divider rounded w-1/2"></div>
                </div>
              ) : purchases.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-[80px] h-[80px] text-neutral-border mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                  <h3 className="text-[15px] font-semibold text-neutral-primary mb-1">No purchases yet</h3>
                  <p className="text-[13px] text-neutral-tertiary">Tap the camera button to capture your first purchase</p>
                </div>
              ) : (
                purchases.map((pur) => (
                  <div
                    key={pur._id}
                    onClick={() => handleSelectPurchase(pur._id)}
                    className={`py-[12px] px-[16px] rounded-[10px] border transition cursor-pointer bg-neutral-card shadow-level-1 ${
                      selectedPurchase?._id === pur._id ? 'border-brand-primary' : 'border-neutral-border hover:border-brand-primary/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[15px] font-semibold text-neutral-primary">#{pur.billNo}</span>
                      {getStatusBadge(pur.status)}
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[14px] text-neutral-secondary truncate max-w-[200px] mb-1">{pur.supplierName}</span>
                        <span className="text-[12px] text-neutral-tertiary">{new Date(pur.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {isAdmin && pur.totalAmount !== undefined ? (
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[16px] font-bold text-neutral-primary">₹{pur.totalAmount.toLocaleString('en-IN')}</span>
                          {(pur.amountPending > 0) && (
                            <span className="text-[12px] text-semantic-warning-text font-medium mt-0.5">Pending ₹{pur.amountPending.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                            <span className="text-[12px] text-neutral-tertiary">—</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Purchase Details Popup Modal */}
            {selectedPurchase && (
              <PurchaseDetailModal
                purchase={selectedPurchase}
                onClose={() => setSelectedPurchase(null)}
                onDeletePurchase={handleDeletePurchase}
                onDeletePurchasePayment={handleDeletePurchasePayment}
                isAdmin={isAdmin}
              />
            )}
          </div>
        )}

        {/* ── TAB 3: EXPENSES ───────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {isAdmin ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Total Expenses Spend</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">₹{expenseTotals.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1">
                  <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Recorded Entries</span>
                  <span className="text-[24px] font-bold text-neutral-primary block mt-1">{expenses.length} Records</span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-between items-center">
              <h3 className="text-[13px] font-semibold text-neutral-primary uppercase tracking-wider">
                Today's Factory Expenses
              </h3>
              <button onClick={loadExpenses} className="text-[13px] text-brand-primary font-medium hover:underline">
                Refresh
              </button>
            </div>

            <input
              type="text"
              placeholder="Search description..."
              value={expSearchTerm}
              onChange={(e) => setExpSearchTerm(e.target.value)}
              className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { label: 'All', value: '' },
                { label: 'Raw Material', value: 'raw_material' },
                { label: 'Electricity', value: 'electricity' },
                { label: 'Salary', value: 'salary' },
                { label: 'Rent', value: 'rent' },
                { label: 'Maintenance', value: 'maintenance' }
              ].map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setExpCategoryFilter(chip.value)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition whitespace-nowrap border-[1.5px] ${
                    expCategoryFilter === chip.value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-transparent text-brand-primary border-brand-primary hover:bg-brand-light'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pb-32">
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
                  <p className="text-[13px] text-neutral-tertiary">Tap the camera button to capture your first expense</p>
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
                        <span className="text-[12px] text-neutral-tertiary">{new Date(exp.date).toLocaleDateString()}</span>
                      </div>

                      {isAdmin && exp.amount !== undefined ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[16px] font-bold text-neutral-primary">₹{exp.amount.toLocaleString('en-IN')}</span>
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
          </div>
        )}

        {/* ── TAB 4: RECEIPTS ────────────────────────────────────────────────── */}
        {/*
        {activeTab === 'receipts' && (
          <div className="space-y-4 pb-32">
            <div className="flex justify-between items-center">
              <h3 className="text-[13px] font-semibold text-neutral-primary uppercase tracking-wider">
                Uploaded Receipts
              </h3>
            </div>
            
            {(() => {
              const allReceipts = [
                ...invoices.filter(i => i.billImageUrl).map(i => ({ url: i.billImageUrl, label: `Invoice #${i.billNo}`, date: i.createdAt })),
                ...invoices.flatMap(i => (i.payments || []).filter(p => p.receiptImageUrl).map(p => ({ url: p.receiptImageUrl, label: `Pay for #${i.billNo}`, date: p.createdAt }))),
                ...purchases.filter(p => p.billImageUrl).map(p => ({ url: p.billImageUrl, label: `Purchase #${p.billNo}`, date: p.createdAt })),
                ...purchases.flatMap(p => (p.payments || []).filter(pp => pp.receiptImageUrl).map(pp => ({ url: pp.receiptImageUrl, label: `Pay for #${p.billNo}`, date: pp.createdAt }))),
                ...expenses.filter(e => e.imageUrl).map(e => ({ url: e.imageUrl, label: e.category.replace('_', ' ').toUpperCase(), date: e.date }))
              ].sort((a, b) => new Date(b.date) - new Date(a.date));
              
              if (allReceipts.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center justify-center text-center bg-neutral-card rounded-[10px] border border-neutral-border shadow-level-1">
                    <p className="text-[13px] text-neutral-tertiary">No receipts found. Upload invoices, purchases, or expenses.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allReceipts.map((receipt, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setPreviewImage(receipt.url)}
                      className="group cursor-pointer bg-neutral-card rounded-[10px] border border-neutral-border shadow-level-1 overflow-hidden hover:border-brand-primary transition"
                    >
                      <div className="aspect-square bg-neutral-bg w-full overflow-hidden relative">
                        <img src={receipt.url} alt="Receipt" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      </div>
                      <div className="p-3">
                        <span className="block text-[12px] font-semibold text-neutral-primary truncate">{receipt.label}</span>
                        <span className="block text-[11px] text-neutral-tertiary">{new Date(receipt.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        */}
      </div>

      {/* Expanded Image Viewer Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white font-semibold rounded-full w-10 h-10 flex items-center justify-center text-lg backdrop-blur-md transition"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Receipt Photo"
              className="max-w-full max-h-[85vh] rounded-[10px] object-contain shadow-level-3 border border-white/10"
            />
            <span className="text-[13px] text-white/70 font-semibold mt-3 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
              Tap anywhere to close
            </span>
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
          if (confirmState.onConfirm) confirmState.onConfirm();
          setConfirmState({ ...confirmState, isOpen: false });
        }}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}

export default HomeView;
