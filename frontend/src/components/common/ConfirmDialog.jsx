import React from 'react';

export function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end p-0 font-sans animate-in fade-in duration-150">
      <div
        className="bg-neutral-card rounded-t-[16px] w-full max-h-[75vh] p-5 shadow-level-3 space-y-5 overflow-y-auto transform transition-transform animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="w-[36px] h-[4px] bg-neutral-border rounded-full mx-auto mb-2" />

        {/* Text Header */}
        <div className="space-y-1.5 text-center">
          <h3 className="text-[16px] font-semibold text-neutral-primary">{title}</h3>
          <p className="text-[13px] text-neutral-secondary">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full h-[48px] text-white text-[15px] font-semibold rounded-[10px] transition flex items-center justify-center gap-2 ${
              isDanger
                ? 'bg-semantic-error-text hover:bg-red-700'
                : 'bg-brand-primary hover:bg-brand-secondary'
            } disabled:opacity-40`}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              confirmText
            )}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full h-[48px] text-brand-primary text-[15px] font-medium rounded-[10px] transition bg-transparent hover:bg-neutral-bg disabled:opacity-40"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
