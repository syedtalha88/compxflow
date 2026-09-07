import React, { useState, useEffect } from 'react';
import { fetchInvoices, fetchInvoiceById, createInvoiceApi, deleteInvoiceApi, deletePaymentApi } from '../../api/index.js';
import AmountDisplay from '../../components/common/AmountDisplay.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import CaptureFlow from '../../components/capture/CaptureFlow.jsx';
import InvoiceDetailModal from '../../components/invoices/InvoiceDetailModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';

export function InvoiceListView() {
  const { isAdmin } = useAuth();
  const { tenantSlug } = useTenant();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetchInvoices({ status: statusFilter, search: searchTerm, slug: tenantSlug });
      if (res.success) setInvoices(res.data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, searchTerm, tenantSlug]);

  const handleSelectInvoice = async (id) => {
    try {
      const res = await fetchInvoiceById(id, tenantSlug);
      if (res.success) setSelectedInvoice(res.data);
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      const res = await deleteInvoiceApi(id, tenantSlug);
      if (res.success) {
        setSelectedInvoice(null);
        loadInvoices();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      const res = await deletePaymentApi(paymentId, tenantSlug);
      if (res.success && selectedInvoice) {
        handleSelectInvoice(selectedInvoice._id);
        loadInvoices();
      }
    } catch (err) {
      console.error('Payment delete failed:', err);
    }
  };

  const handleInvoiceCreated = async (capturedData) => {
    try {
      const payload = {
        billNo: capturedData.billNo,
        customerName: capturedData.partyName,
        totalAmount: capturedData.amount,
        billImageUrl: capturedData.ocrResult?.imageUrl,
        billImagePublicId: capturedData.ocrResult?.imagePublicId
      };

      const res = await createInvoiceApi(payload, tenantSlug);
      if (res.success) {
        setShowCaptureModal(false);
        loadInvoices();
      }
    } catch (err) {
      alert(`Save failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const totals = invoices.reduce((acc, inv) => {
    acc.total += inv.totalAmount || 0;
    acc.received += inv.amountReceived || 0;
    acc.pending += inv.amountPending || 0;
    return acc;
  }, { total: 0, received: 0, pending: 0 });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-neutral-bg pb-24 font-sans px-4 pt-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-primary tracking-tight">Invoices</h1>
          <p className="text-[13px] text-neutral-tertiary font-medium">{invoices.length} Total Sales Records</p>
        </div>

        <button
          onClick={() => setShowCaptureModal(true)}
          className="px-4 py-2 bg-brand-primary text-white text-[14px] font-semibold rounded-[8px] shadow-level-1 flex items-center gap-2 hover:bg-brand-secondary active:scale-[0.97] transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[18px] h-[18px]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          <span>Capture</span>
        </button>
      </div>

      {/* Admin Live Totals (UI_DESIGN.md) */}
      {isAdmin ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-neutral-card p-3 rounded-[10px] border border-neutral-border shadow-level-1">
            <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Total</span>
            <AmountDisplay amount={totals.total} className="text-[16px] font-bold text-neutral-primary block mt-0.5" />
          </div>
          <div className="bg-neutral-card p-3 rounded-[10px] border border-neutral-border shadow-level-1">
            <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Received</span>
            <AmountDisplay amount={totals.received} className="text-[16px] font-bold text-neutral-primary block mt-0.5" />
          </div>
          <div className="bg-neutral-card p-3 rounded-[10px] border border-neutral-border shadow-level-1">
            <span className="block text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">Pending</span>
            <AmountDisplay amount={totals.pending} className="text-[16px] font-bold text-neutral-primary block mt-0.5" />
          </div>
        </div>
      ) : (
        <div className="bg-neutral-card p-3 rounded-[10px] text-center border border-neutral-border shadow-level-1">
          <span className="text-[13px] font-semibold text-neutral-tertiary">🔒 Totals Redacted for Member</span>
        </div>
      )}

      {/* Sticky Search Bar */}
      <input
        type="text"
        placeholder="Search bill number or customer..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
      />

      {/* Status Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { label: 'All', value: '' },
          { label: 'Pending', value: 'pending' },
          { label: 'Partial', value: 'partially_paid' },
          { label: 'Paid', value: 'paid' }
        ].map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition whitespace-nowrap border-[1.5px] ${
              statusFilter === chip.value ? 'bg-brand-primary text-white border-brand-primary shadow-level-1' : 'bg-transparent text-brand-primary border-brand-primary hover:bg-brand-light'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Invoice Cards List */}
      <div className="space-y-3">
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
             <p className="text-[13px] text-neutral-tertiary">Tap the capture button to add your first invoice</p>
           </div>
        ) : (
          invoices.map((inv) => (
            <div
              key={inv._id}
              onClick={() => handleSelectInvoice(inv._id)}
              className="py-[12px] px-[16px] rounded-[10px] border border-neutral-border bg-neutral-card shadow-level-1 hover:border-brand-primary/50 transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[15px] font-semibold text-neutral-primary">#{inv.billNo}</span>
                <StatusBadge status={inv.status} />
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[14px] text-neutral-secondary truncate max-w-[200px] mb-1">{inv.customerName}</span>
                  <span className="text-[12px] text-neutral-tertiary">{new Date(inv.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="text-right flex flex-col items-end">
                  <AmountDisplay amount={inv.totalAmount} className="text-[16px] font-bold text-neutral-primary" fallback="—" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Shared Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onDeleteInvoice={handleDeleteInvoice}
          onDeletePayment={handleDeletePayment}
          isAdmin={isAdmin}
        />
      )}

      {/* Capture Flow Overlay */}
      {showCaptureModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <CaptureFlow
              type="invoice"
              slug={tenantSlug}
              onComplete={handleInvoiceCreated}
              onCancel={() => setShowCaptureModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceListView;
