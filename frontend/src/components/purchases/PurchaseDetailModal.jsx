import React, { useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog.jsx';

export function PurchaseDetailModal({
  purchase,
  onClose,
  onDeletePurchase,
  onDeletePurchasePayment,
  isAdmin = false
}) {
  const [previewImage, setPreviewImage] = useState(null);

  // Confirm Dialog state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null, // 'purchase' | 'payment'
    targetId: null
  });

  if (!purchase) return null;

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

  const promptDeletePurchase = () => {
    setConfirmState({
      isOpen: true,
      title: `Delete Purchase Bill #${purchase.billNo}?`,
      message: `Are you sure you want to delete this purchase record from ${purchase.supplierName}? All linked supplier payments will also be permanently removed.`,
      actionType: 'purchase',
      targetId: purchase._id
    });
  };

  const promptDeletePayment = (paymentId, amount) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Purchase Payment Receipt?',
      message: `Are you sure you want to delete this payment settlement entry of ₹${amount?.toLocaleString('en-IN') || ''}?`,
      actionType: 'payment',
      targetId: paymentId
    });
  };

  const handleConfirmAction = () => {
    const { actionType, targetId } = confirmState;
    setConfirmState({ ...confirmState, isOpen: false });

    if (actionType === 'purchase' && onDeletePurchase) {
      onDeletePurchase(targetId);
    } else if (actionType === 'payment' && onDeletePurchasePayment) {
      onDeletePurchasePayment(targetId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-card w-full sm:max-w-md rounded-t-[20px] sm:rounded-[12px] p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-level-3 border border-neutral-border font-sans transform transition-transform animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Handle Bar for Mobile */}
        <div className="w-12 h-1.5 bg-neutral-border rounded-full mx-auto mb-2 sm:hidden"></div>

        {/* Header */}
        <div className="flex justify-between items-start border-b border-neutral-divider pb-3">
          <div>
            <span className="text-[11px] font-semibold uppercase text-neutral-tertiary tracking-wider">Purchase Bill</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-[20px] font-bold text-neutral-primary">#{purchase.billNo}</h3>
              {getStatusBadge(purchase.status)}
            </div>
            <p className="text-[14px] text-neutral-secondary font-medium mt-0.5">{purchase.supplierName}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={promptDeletePurchase}
                className="text-[12px] bg-semantic-error-bg text-semantic-error-text border border-semantic-error-border font-semibold px-3 py-1.5 rounded-[8px] hover:opacity-80 transition"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[16px] font-bold text-neutral-tertiary hover:text-neutral-primary bg-neutral-bg rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-[12px] p-3.5 rounded-[10px] border border-neutral-border shadow-level-1 bg-neutral-bg">
          <div>
            <span className="text-neutral-tertiary font-semibold block text-[11px] uppercase">Bill Date</span>
            <span className="font-bold text-neutral-primary text-[14px]">{new Date(purchase.date || purchase.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
          {isAdmin && (
            <>
              <div>
                <span className="text-neutral-tertiary font-semibold block text-[11px] uppercase">Total Spend</span>
                <span className="font-bold text-neutral-primary text-[14px] block mt-0.5">₹ {purchase.totalAmount?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div>
                <span className="text-neutral-tertiary font-semibold block text-[11px] uppercase">Amount Pending</span>
                <span className="font-bold text-semantic-warning-text text-[14px] block mt-0.5">₹ {purchase.amountPending?.toLocaleString('en-IN') || 0}</span>
              </div>
            </>
          )}
        </div>

        {/* Photo Thumbnail Preview */}
        {purchase.imageUrl && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider block">
              Supplier Bill Photo
            </span>
            <div
              onClick={() => setPreviewImage(purchase.imageUrl)}
              className="relative group rounded-[10px] overflow-hidden border border-neutral-border bg-black cursor-pointer shadow-level-1"
            >
              <img src={purchase.imageUrl} alt="Purchase Photo" className="w-full h-40 object-cover group-hover:scale-105 transition duration-300 opacity-90 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-[13px] font-semibold text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                  Tap to Expand
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Payments History */}
        {isAdmin && (
          <div className="space-y-2 pt-2 border-t border-neutral-divider">
            <h4 className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider">
              Payment Receipts ({purchase.payments?.length || 0})
            </h4>
            <div className="space-y-2">
              {!purchase.payments || purchase.payments.length === 0 ? (
                <div className="p-3 bg-neutral-bg rounded-[10px] border border-neutral-border text-center">
                  <p className="text-[13px] text-neutral-tertiary font-medium">No payment settlements recorded.</p>
                </div>
              ) : (
                purchase.payments.map((pmt) => (
                  <div key={pmt._id} className="p-3 bg-neutral-card rounded-[10px] border border-neutral-border shadow-level-1 space-y-2 text-[13px]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-neutral-primary text-[14px] block">
                          ₹ {pmt.amount?.toLocaleString('en-IN')} Paid
                        </span>
                        <span className="text-[12px] text-neutral-tertiary font-medium block mt-0.5">
                          {new Date(pmt.paymentDate || pmt.createdAt || pmt.capturedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => promptDeletePayment(pmt._id, pmt.amount)}
                          className="text-[12px] text-semantic-error-text hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {pmt.receiptImageUrl && (
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-divider">
                        <div
                          onClick={() => setPreviewImage(pmt.receiptImageUrl)}
                          className="w-12 h-12 rounded-[6px] overflow-hidden border border-neutral-border bg-neutral-bg shrink-0 cursor-pointer hover:opacity-90 transition relative group"
                        >
                          <img src={pmt.receiptImageUrl} alt="Payment Receipt" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <button
                            onClick={() => setPreviewImage(pmt.receiptImageUrl)}
                            className="text-[13px] font-semibold text-brand-primary hover:underline"
                          >
                            View Receipt Image
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full h-[48px] bg-neutral-bg hover:bg-neutral-border text-neutral-primary text-[15px] font-semibold rounded-[8px] transition"
        >
          Close Details
        </button>

        {/* Expanded Image Viewer Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-zoom-out"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-full max-h-full flex flex-col items-center">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white font-semibold rounded-full w-10 h-10 flex items-center justify-center text-lg backdrop-blur-md transition"
              >
                ✕
              </button>
              <img
                src={previewImage}
                alt="Expanded Preview"
                className="max-w-full max-h-[85vh] rounded-[10px] object-contain shadow-level-3 border border-white/10"
              />
              <span className="text-[13px] text-white/70 font-semibold mt-3 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
                Tap anywhere to dismiss
              </span>
            </div>
          </div>
        )}

        {/* In-App Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmText="Delete"
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
        />
      </div>
    </div>
  );
}

export default PurchaseDetailModal;
