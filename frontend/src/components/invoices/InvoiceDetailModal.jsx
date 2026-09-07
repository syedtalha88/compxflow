import React, { useState } from 'react';
import StatusBadge from '../common/StatusBadge.jsx';
import AmountDisplay from '../common/AmountDisplay.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';

export function InvoiceDetailModal({ invoice, onClose, onDeleteInvoice, onDeletePayment, isAdmin = true }) {
  const [expandedImage, setExpandedImage] = useState(null);
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null,
    targetId: null
  });

  if (!invoice) return null;

  const promptDeleteInvoice = () => {
    setConfirmState({
      isOpen: true,
      title: `Delete Invoice #${invoice.billNo}?`,
      message: `Are you sure you want to delete this invoice for ${invoice.customerName}? All linked payment receipts will also be permanently removed.`,
      actionType: 'invoice',
      targetId: invoice._id
    });
  };

  const promptDeletePayment = (paymentId, amount) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Payment Receipt?',
      message: `Are you sure you want to delete this payment receipt of ₹${amount?.toLocaleString('en-IN') || ''}?`,
      actionType: 'payment',
      targetId: paymentId
    });
  };

  const handleConfirmAction = () => {
    const { actionType, targetId } = confirmState;
    setConfirmState({ ...confirmState, isOpen: false });

    if (actionType === 'invoice' && onDeleteInvoice) {
      onDeleteInvoice(targetId);
    } else if (actionType === 'payment' && onDeletePayment) {
      onDeletePayment(targetId);
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
            <span className="text-[11px] text-neutral-tertiary uppercase font-semibold tracking-wider">Sales Invoice</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-[20px] font-bold text-neutral-primary">#{invoice.billNo}</h3>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-[14px] text-neutral-secondary font-medium mt-0.5">{invoice.customerName}</p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onDeleteInvoice && (
              <button
                onClick={promptDeleteInvoice}
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

        {/* Financial Summary Cards */}
        {isAdmin && invoice.totalAmount !== undefined ? (
          <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
            <div className="bg-neutral-card p-3 rounded-[10px] border border-neutral-border shadow-level-1">
              <span className="block text-[11px] text-neutral-secondary uppercase font-semibold">Total</span>
              <AmountDisplay amount={invoice.totalAmount} className="font-bold text-neutral-primary text-[14px] block mt-0.5" />
            </div>
            <div className="bg-neutral-card p-3 rounded-[10px] border border-neutral-border shadow-level-1">
              <span className="block text-[11px] text-neutral-secondary uppercase font-semibold">Received</span>
              <AmountDisplay amount={invoice.amountReceived || 0} className="font-bold text-neutral-primary text-[14px] block mt-0.5" />
            </div>
            <div className="bg-neutral-card p-3 rounded-[10px] border border-neutral-border shadow-level-1">
              <span className="block text-[11px] text-neutral-secondary uppercase font-semibold">Pending</span>
              <AmountDisplay amount={invoice.amountPending || 0} className="font-bold text-neutral-primary text-[14px] block mt-0.5" />
            </div>
          </div>
        ) : (
          <div className="bg-neutral-card p-3 rounded-[10px] text-center border border-neutral-border shadow-level-1">
            <span className="text-[13px] font-semibold text-neutral-tertiary">🔒 Financial Amounts Redacted for Member Role</span>
          </div>
        )}

        {/* Attached Original Bill Photo */}
        {invoice.billImageUrl && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider block">
              Uploaded Invoice Image
            </span>
            <div
              onClick={() => setExpandedImage(invoice.billImageUrl)}
              className="relative group rounded-[10px] overflow-hidden border border-neutral-border bg-black cursor-pointer shadow-level-1"
            >
              <img
                src={invoice.billImageUrl}
                alt="Original Bill"
                className="w-full h-40 object-cover group-hover:scale-105 transition duration-300 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-[13px] font-semibold text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                  Tap to Expand
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Linked Payments & Receipts */}
        <div className="space-y-2 pt-2 border-t border-neutral-divider">
          <div className="flex justify-between items-center">
            <h5 className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider">
              Payment Receipts ({invoice.payments?.length || 0})
            </h5>
          </div>

          <div className="space-y-2">
            {!invoice.payments || invoice.payments.length === 0 ? (
              <div className="p-3 bg-neutral-bg rounded-[10px] border border-neutral-border text-center">
                <p className="text-[13px] text-neutral-tertiary font-medium">No payment receipts attached.</p>
              </div>
            ) : (
              invoice.payments.map((p) => (
                <div
                  key={p._id}
                  className="p-3 bg-neutral-card rounded-[10px] border border-neutral-border shadow-level-1 space-y-2 text-[13px]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      {isAdmin && p.amount !== undefined ? (
                        <span className="font-bold text-neutral-primary text-[14px] block">
                          ₹ {Number(p.amount).toLocaleString('en-IN')} Received
                        </span>
                      ) : (
                        <span className="font-bold text-neutral-primary text-[14px] block">Payment Receipt</span>
                      )}
                      <span className="text-[12px] text-neutral-tertiary font-medium block mt-0.5">
                        {new Date(p.capturedAt || p.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {isAdmin && onDeletePayment && (
                      <button
                        onClick={() => promptDeletePayment(p._id, p.amount)}
                        className="text-[12px] text-semantic-error-text hover:underline font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Attached Receipt Image */}
                  {p.receiptImageUrl && (
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-divider">
                      <div
                        onClick={() => setExpandedImage(p.receiptImageUrl)}
                        className="w-12 h-12 rounded-[6px] overflow-hidden border border-neutral-border bg-neutral-bg shrink-0 cursor-pointer hover:opacity-90 transition relative group"
                      >
                        <img src={p.receiptImageUrl} alt="Payment Receipt" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <button
                          onClick={() => setExpandedImage(p.receiptImageUrl)}
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

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full h-[48px] bg-neutral-bg hover:bg-neutral-border text-neutral-primary text-[15px] font-semibold rounded-[8px] transition"
        >
          Close Details
        </button>
      </div>

      {/* Expanded Full-Screen Image Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-zoom-out"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white font-semibold rounded-full w-10 h-10 flex items-center justify-center text-lg backdrop-blur-md transition"
            >
              ✕
            </button>
            <img
              src={expandedImage}
              alt="Expanded Preview"
              className="max-w-full max-h-[85vh] rounded-[10px] object-contain shadow-level-3 border border-white/10"
            />
            <span className="text-[13px] text-white/70 font-semibold mt-3 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
              Tap anywhere to dismiss
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
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}

export default InvoiceDetailModal;
