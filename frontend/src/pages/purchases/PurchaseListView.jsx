import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { fetchPurchases, fetchPurchaseById, deletePurchaseApi, deletePurchasePaymentApi } from '../../api/index.js';
import CaptureFlow from '../../components/capture/CaptureFlow.jsx';
import PurchaseDetailModal from '../../components/purchases/PurchaseDetailModal.jsx';

export function PurchaseListView() {
  const { isAdmin } = useAuth();
  const { tenantSlug } = useTenant();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [captureType, setCaptureType] = useState(null); // 'purchase' | 'purchase_payment'
  const [previewImage, setPreviewImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPurchases = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchPurchases({
        status: statusFilter,
        search: searchTerm,
        slug: tenantSlug
      });
      if (res.success) {
        setPurchases(res.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load purchase records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [statusFilter, searchTerm, tenantSlug]);

  const handleSelectPurchase = async (id) => {
    setSelectedPurchase(null);
    try {
      const res = await fetchPurchaseById(id, tenantSlug);
      if (res.success) {
        setSelectedPurchase(res.data);
      }
    } catch (err) {
      console.error('Error fetching purchase detail:', err);
    }
  };

  const handleDeletePurchase = async (id) => {
    try {
      const res = await deletePurchaseApi(id, tenantSlug);
      if (res.success) {
        setSelectedPurchase(null);
        loadPurchases();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete purchase');
    }
  };

  const handleDeletePurchasePayment = async (paymentId) => {
    try {
      const res = await deletePurchasePaymentApi(paymentId, tenantSlug);
      if (res.success) {
        if (selectedPurchase) handleSelectPurchase(selectedPurchase._id);
        loadPurchases();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete purchase payment');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Paid</span>;
      case 'partially_paid':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Partial</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">Pending</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-primary tracking-tight">Purchases</h1>
          <p className="text-[13px] text-neutral-tertiary font-medium">{purchases.length} Total Supplier Bills</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCaptureType('purchase')}
            className="px-4 py-2 bg-brand-primary text-white text-[14px] font-semibold rounded-[8px] shadow-level-1 flex items-center gap-2 hover:bg-brand-secondary active:scale-[0.97] transition"
          >
            <span>Capture</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <input
        type="text"
        placeholder="Search Supplier Name or Bill No..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
      />

      {/* Status Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: '', label: 'All Purchases' },
          { id: 'pending', label: 'Pending' },
          { id: 'partially_paid', label: 'Partial' },
          { id: 'paid', label: 'Paid' }
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setStatusFilter(chip.id)}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition whitespace-nowrap border-[1.5px] ${
              statusFilter === chip.id
                ? 'bg-brand-primary text-white border-brand-primary shadow-level-1'
                : 'bg-transparent text-brand-primary border-brand-primary hover:bg-brand-light'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3 bg-semantic-error-bg border border-semantic-error-border text-semantic-error-text text-[13px] font-medium rounded-[8px] text-center">
          {errorMsg}
        </div>
      )}

      {/* Purchase Cards List */}
      <div className="space-y-3">
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
             <p className="text-[13px] text-neutral-tertiary">Tap the capture button to add your first purchase</p>
           </div>
        ) : (
          purchases.map((pur) => (
            <div
              key={pur._id}
              onClick={() => handleSelectPurchase(pur._id)}
              className="py-[12px] px-[16px] rounded-[10px] border border-neutral-border bg-neutral-card shadow-level-1 hover:border-brand-primary/50 transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[15px] font-semibold text-neutral-primary">#{pur.billNo}</span>
                {getStatusBadge(pur.status)}
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[14px] text-neutral-secondary truncate max-w-[200px] mb-1">{pur.supplierName}</span>
                  <span className="text-[12px] text-neutral-tertiary">{new Date(pur.date || pur.createdAt).toLocaleDateString()}</span>
                </div>
                
                {isAdmin ? (
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[16px] font-bold text-neutral-primary">₹{pur.totalAmount?.toLocaleString('en-IN') || 0}</span>
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

      {/* Detail Modal */}
      {selectedPurchase && (
        <PurchaseDetailModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          onDeletePurchase={handleDeletePurchase}
          onDeletePurchasePayment={handleDeletePurchasePayment}
          isAdmin={isAdmin}
        />
      )}

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
            <img src={previewImage} alt="Expanded Bill" className="max-w-full max-h-[85vh] rounded-[10px] object-contain shadow-level-3 border border-white/10" />
            <span className="text-[13px] text-white/70 font-semibold mt-3 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
              Tap anywhere to close
            </span>
          </div>
        </div>
      )}

      {/* Capture Flow Modal Overlay */}
      {captureType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <CaptureFlow
              type={captureType}
              slug={tenantSlug}
              onComplete={() => {
                setCaptureType(null);
                loadPurchases();
              }}
              onCancel={() => setCaptureType(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseListView;
