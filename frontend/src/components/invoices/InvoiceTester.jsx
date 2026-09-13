import React, { useState, useEffect } from 'react';
import {
  loginUser,
  fetchInvoices,
  createInvoiceApi,
  fetchInvoiceById,
  deleteInvoiceApi,
  createPaymentApi,
  deletePaymentApi,
  getAccessToken
} from '../../api/index.js';

export function InvoiceTester() {
  const [slug, setSlug] = useState('kaleem');
  const [currentUser, setCurrentUser] = useState(null); // { email, role }
  const [authMsg, setAuthMsg] = useState('');

  // Invoice List State
  const [invoices, setInvoices] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  // New Invoice Form State
  const [billNo, setBillNo] = useState('INV-1001');
  const [customerName, setCustomerName] = useState('Ramesh Wood Crafts');
  const [totalAmount, setTotalAmount] = useState('10000');
  const [billImageUrl, setBillImageUrl] = useState('https://res.cloudinary.com/demo/image/upload/sample.jpg');
  const [billImagePublicId, setBillImagePublicId] = useState('sample');
  const [createMsg, setCreateMsg] = useState('');

  // Selected Invoice Detail & Payment State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('4000');
  const [paymentMsg, setPaymentMsg] = useState('');

  // 1. Initial Login as Admin
  const handleAuth = async (email, password) => {
    setAuthMsg('');
    try {
      const res = await loginUser({ email, password, slug });
      if (res.success) {
        setCurrentUser({ email: res.data.user.email, role: res.data.role });
        setAuthMsg(`Authenticated as ${res.data.user.email} (${res.data.role.toUpperCase()})`);
        loadInvoices();
      }
    } catch (err) {
      setAuthMsg(`Auth failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // 2. Fetch Invoices
  const loadInvoices = async () => {
    setLoadingList(true);
    try {
      const res = await fetchInvoices({ status: filterStatus, search: searchTerm, slug });
      if (res.success) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (getAccessToken()) {
      loadInvoices();
    }
  }, [filterStatus, searchTerm]);

  // 3. Create Invoice Handler
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      const res = await createInvoiceApi({
        billNo,
        customerName,
        totalAmount,
        billImageUrl,
        billImagePublicId
      }, slug);

      if (res.success) {
        setCreateMsg(`✓ Invoice '${res.data.billNo}' created successfully!`);
        loadInvoices();
      }
    } catch (err) {
      setCreateMsg(`❌ ${err.response?.data?.message || err.message}`);
    }
  };

  // 4. View Detail & Payments
  const handleSelectInvoice = async (id) => {
    setSelectedInvoice(null);
    setPaymentMsg('');
    try {
      const res = await fetchInvoiceById(id, slug);
      if (res.success) {
        setSelectedInvoice(res.data);
      }
    } catch (err) {
      setPaymentMsg(`Failed to load details: ${err.response?.data?.message || err.message}`);
    }
  };

  // 5. Add Payment Handler
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaymentMsg('');

    try {
      const res = await createPaymentApi({
        invoiceId: selectedInvoice._id,
        amount: paymentAmount,
        receiptImageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        receiptImagePublicId: 'receipt_sample'
      }, slug);

      if (res.success) {
        setPaymentMsg('✓ Payment recorded successfully!');
        handleSelectInvoice(selectedInvoice._id);
        loadInvoices();
      }
    } catch (err) {
      setPaymentMsg(`❌ ${err.response?.data?.message || err.message}`);
    }
  };

  // 6. Delete Payment Handler
  const handleDeletePayment = async (paymentId) => {
    setPaymentMsg('');
    try {
      const res = await deletePaymentApi(paymentId, slug);
      if (res.success) {
        setPaymentMsg('✓ Payment deleted & invoice totals reversed!');
        handleSelectInvoice(selectedInvoice._id);
        loadInvoices();
      }
    } catch (err) {
      setPaymentMsg(`❌ ${err.response?.data?.message || err.message}`);
    }
  };

  // 7. Delete Invoice Handler
  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Delete this invoice and all associated payments?')) return;
    try {
      const res = await deleteInvoiceApi(invoiceId, slug);
      if (res.success) {
        setSelectedInvoice(null);
        loadInvoices();
      }
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Paid</span>;
      case 'partially_paid':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Partial</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Pending</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 font-sans space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <span>🧾</span> CompXFlow Invoice & Payment Tester (Phase 4)
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Test Invoice CRUD, Duplicate Bill checks, Member Role amount hiding, and Atomic Payments.
        </p>
      </div>

      {/* Auth Switcher */}
      <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Active Role & Session</h3>
          <p className="text-xs font-semibold text-gray-700 mt-0.5">
            {currentUser ? `${currentUser.email} (${currentUser.role.toUpperCase()})` : 'Not Authenticated'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleAuth('kaleem@compxflow.com', 'Password123!')}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition"
          >
            Login as ADMIN
          </button>
          <button
            onClick={() => handleAuth('worker@compxflow.com', 'Password123!')}
            className="px-3 py-1.5 bg-gray-700 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition"
          >
            Login as MEMBER (Amounts Hidden)
          </button>
        </div>
      </div>
      {authMsg && <p className="text-xs font-medium text-purple-700">{authMsg}</p>}

      {/* Grid: Create Invoice Form & Invoices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Form */}
        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Create New Invoice</h3>
          <form onSubmit={handleCreateInvoice} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Bill Number</label>
              <input
                type="text"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Customer / Party Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Total Amount (₹)</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!currentUser}
              className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
              + Create Invoice
            </button>
          </form>

          {createMsg && (
            <p className={`text-xs font-semibold ${createMsg.includes('❌') ? 'text-rose-600' : 'text-emerald-700'}`}>
              {createMsg}
            </p>
          )}
        </div>

        {/* Invoice List & Filters */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Invoices List ({invoices.length})</h3>
            <button onClick={loadInvoices} className="text-xs text-primary hover:underline font-semibold">🔄 Refresh</button>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search bill no or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <div className="flex gap-1">
              {['', 'pending', 'partially_paid', 'paid'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition ${
                    filterStatus === st ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* List Items */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {loadingList ? (
              <p className="text-xs text-gray-400 py-4 text-center">Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No invoices found</p>
            ) : (
              invoices.map((inv) => (
                <div
                  key={inv._id}
                  onClick={() => handleSelectInvoice(inv._id)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                    selectedInvoice?._id === inv._id ? 'border-primary bg-purple-50/40 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">{inv.billNo}</span>
                      {getStatusBadge(inv.status)}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{inv.customerName}</p>
                  </div>

                  <div className="text-right">
                    {inv.totalAmount !== undefined ? (
                      <div>
                        <span className="text-xs font-bold text-primary block">₹ {inv.totalAmount.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-gray-400 block">Pending: ₹ {(inv.amountPending || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-bold">— (Amounts Hidden)</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Invoice Details & Payment Panel */}
      {selectedInvoice && (
        <div className="p-4 border border-primary/30 rounded-xl bg-purple-50/20 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <div>
              <h3 className="text-sm font-bold text-primary">Invoice Details: {selectedInvoice.billNo}</h3>
              <p className="text-xs text-gray-600">Customer: {selectedInvoice.customerName}</p>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(selectedInvoice.status)}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleDeleteInvoice(selectedInvoice._id)}
                  className="px-2 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-md hover:bg-rose-700"
                >
                  Delete Invoice
                </button>
              )}
            </div>
          </div>

          {/* Amounts Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Total Amount</span>
              <span className="text-xs font-bold text-gray-800">
                {selectedInvoice.totalAmount !== undefined ? `₹ ${selectedInvoice.totalAmount.toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Amount Received</span>
              <span className="text-xs font-bold text-emerald-700">
                {selectedInvoice.amountReceived !== undefined ? `₹ ${selectedInvoice.amountReceived.toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Amount Pending</span>
              <span className="text-xs font-bold text-amber-700">
                {selectedInvoice.amountPending !== undefined ? `₹ ${selectedInvoice.amountPending.toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
          </div>

          {/* Record Payment Section */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Record Payment</h4>
            <form onSubmit={handleAddPayment} className="flex gap-2">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Payment Amount"
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none flex-1"
                required
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition"
              >
                + Add Payment
              </button>
            </form>
            {paymentMsg && <p className="text-xs font-medium text-purple-700">{paymentMsg}</p>}
          </div>

          {/* Payments History */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Payments History ({selectedInvoice.payments?.length || 0})
            </h4>
            <div className="space-y-1.5">
              {selectedInvoice.payments?.map((p) => (
                <div key={p._id} className="p-2 bg-white rounded-lg border border-gray-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-emerald-700">
                      {p.amount !== undefined ? `₹ ${p.amount.toLocaleString('en-IN')}` : 'Payment Received'}
                    </span>
                    <span className="text-[10px] text-gray-400 block">{new Date(p.capturedAt).toLocaleString()}</span>
                  </div>

                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDeletePayment(p._id)}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Delete (Reverse)
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceTester;
