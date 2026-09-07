import React, { useState } from 'react';
import {
  extractOcr,
  createInvoiceApi,
  createPaymentApi,
  createPurchaseApi,
  createPurchasePaymentApi,
  createExpenseApi,
  fetchInvoices,
  fetchPurchases
} from '../../api/index.js';

const EXPENSE_CATEGORIES = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'labor', label: 'Labor / Salary' },
  { value: 'salary', label: 'Staff Salary' },
  { value: 'rent', label: 'Factory Rent' },
  { value: 'electricity', label: 'Electricity / Power' },
  { value: 'transport', label: 'Transport / Freight' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other Overhead' }
];

/**
 * CaptureFlow component
 * Supports: 'invoice' | 'payment' | 'purchase' | 'purchase_payment' | 'expense'
 */
export function CaptureFlow({ type = 'invoice', slug = 'kaleem', onComplete, onCancel }) {
  const [step, setStep] = useState(type === 'expense' ? 'confirm' : 'camera'); // 'camera' | 'processing' | 'confirm' | 'success'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Extracted Single Fields
  const [billNo, setBillNo] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('raw_material');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const [imageUrl, setImageUrl] = useState('');
  const [imagePublicId, setImagePublicId] = useState('');
  const [confidence, setConfidence] = useState('');

  // Multi-Bill Receipt Items State (for Sales Payment & Purchase Payment Settlement)
  // Array of { billNo, amount, matchedRecords: [], selectedId: '' }
  const [receiptItems, setReceiptItems] = useState([]);

  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Helper to search and match invoices for a billNo
  const findMatchingInvoices = async (searchBillNo) => {
    if (!searchBillNo || !searchBillNo.trim()) return [];
    try {
      const invListRes = await fetchInvoices({ search: searchBillNo.trim(), slug });
      if (invListRes.success && invListRes.data.length > 0) return invListRes.data;
    } catch (e) {
      console.error('Invoice matching error:', e);
    }
    return [];
  };

  // Helper to search and match purchases for a billNo
  const findMatchingPurchases = async (searchBillNo) => {
    if (!searchBillNo || !searchBillNo.trim()) return [];
    try {
      const purListRes = await fetchPurchases({ search: searchBillNo.trim(), slug });
      if (purListRes.success && purListRes.data.length > 0) return purListRes.data;
    } catch (e) {
      console.error('Purchase matching error:', e);
    }
    return [];
  };

  // Step 1 -> Step 2: Handle File Selection & Trigger OCR
  const handleFileSelect = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('processing');
    setLoadingMsg('Uploading photo to Cloudinary & extracting text with AI...');
    setErrorMsg('');

    try {
      const ocrType = type === 'purchase_payment' ? 'payment' : type;
      const ocrRes = await extractOcr(file, ocrType, slug);

      if (ocrRes.success) {
        const { billNo: ocrBillNo, name: ocrName, amount: ocrAmount, items: ocrItems, imageUrl: url, imagePublicId: pubId, confidence: conf } = ocrRes.data;

        setBillNo(ocrBillNo || '');
        setPartyName(ocrName || '');
        setAmount(ocrAmount !== null && ocrAmount !== undefined ? ocrAmount.toString() : '');
        setImageUrl(url);
        setImagePublicId(pubId);
        setConfidence(conf);

        if (type === 'payment' || type === 'purchase_payment') {
          const rawItems = (ocrItems && ocrItems.length > 0)
            ? ocrItems
            : (ocrBillNo ? [{ billNo: ocrBillNo, amount: ocrAmount || 0 }] : []);

          if (rawItems.length > 0) {
            setLoadingMsg(`Matching extracted bill numbers with ${type === 'purchase_payment' ? 'purchases' : 'invoices'}...`);
            const processedItems = await Promise.all(
              rawItems.map(async (item) => {
                const matches = type === 'purchase_payment'
                  ? await findMatchingPurchases(item.billNo)
                  : await findMatchingInvoices(item.billNo);

                return {
                  billNo: item.billNo || '',
                  amount: item.amount ? item.amount.toString() : '',
                  matchedRecords: matches,
                  selectedId: matches.length > 0 ? matches[0]._id : ''
                };
              })
            );
            setReceiptItems(processedItems);
          } else {
            setReceiptItems([{ billNo: '', amount: '', matchedRecords: [], selectedId: '' }]);
          }
        }

        setStep('confirm');
      }
    } catch (err) {
      console.error('Capture OCR error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to process image');
      if (type === 'payment' || type === 'purchase_payment') {
        setReceiptItems([{ billNo: '', amount: '', matchedRecords: [], selectedId: '' }]);
      }
      setStep('confirm');
    }
  };

  const handleItemChange = async (index, field, value) => {
    const updated = [...receiptItems];
    updated[index][field] = value;

    if (field === 'billNo') {
      if (value.trim()) {
        const matches = type === 'purchase_payment'
          ? await findMatchingPurchases(value)
          : await findMatchingInvoices(value);

        updated[index].matchedRecords = matches;
        updated[index].selectedId = matches.length > 0 ? matches[0]._id : '';
      } else {
        updated[index].matchedRecords = [];
        updated[index].selectedId = '';
      }
    }

    setReceiptItems(updated);
  };

  const handleAddItem = () => {
    setReceiptItems([
      ...receiptItems,
      { billNo: '', amount: '', matchedRecords: [], selectedId: '' }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (receiptItems.length === 1) return;
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  // Confirm & Save to Database
  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (type === 'invoice') {
      if (!billNo.trim() || !partyName.trim() || !amount || parseFloat(amount) <= 0) {
        setErrorMsg('Bill Number, Customer Name, and valid total amount are required');
        return;
      }

      setLoadingMsg('Saving digital sales invoice...');
      setStep('processing');

      try {
        const res = await createInvoiceApi({
          billNo: billNo.trim(),
          customerName: partyName.trim(),
          totalAmount: parseFloat(amount),
          billImageUrl: imageUrl || 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          billImagePublicId: imagePublicId || 'sample'
        }, slug);

        if (res.success) {
          setStep('success');
          setTimeout(() => { if (onComplete) onComplete(res.data); }, 1500);
        }
      } catch (err) {
        setStep('confirm');
        setErrorMsg(err.response?.status === 409 ? `⛔ Duplicate Bill '${billNo}' already exists.` : (err.response?.data?.message || err.message));
      }
    } else if (type === 'purchase') {
      if (!billNo.trim() || !partyName.trim() || !amount || parseFloat(amount) <= 0) {
        setErrorMsg('Purchase Bill Number, Supplier Name, and valid total amount are required');
        return;
      }

      setLoadingMsg('Saving purchase bill record...');
      setStep('processing');

      try {
        const res = await createPurchaseApi({
          billNo: billNo.trim(),
          supplierName: partyName.trim(),
          totalAmount: parseFloat(amount),
          billImageUrl: imageUrl || 'https://res.cloudinary.com/demo/image/upload/sample_pur.jpg',
          billImagePublicId: imagePublicId || 'sample_pur'
        }, slug);

        if (res.success) {
          setStep('success');
          setTimeout(() => { if (onComplete) onComplete(res.data); }, 1500);
        }
      } catch (err) {
        setStep('confirm');
        setErrorMsg(err.response?.status === 409 ? `⛔ Duplicate Purchase Bill '${billNo}' already exists.` : (err.response?.data?.message || err.message));
      }
    } else if (type === 'expense') {
      if (!amount || parseFloat(amount) <= 0 || !expenseDate) {
        setErrorMsg('Valid amount and date are required');
        return;
      }

      setLoadingMsg('Recording factory expense...');
      setStep('processing');

      try {
        const res = await createExpenseApi({
          amount: parseFloat(amount),
          category: expenseCategory,
          description: expenseDesc.trim(),
          date: expenseDate,
          imageUrl: imageUrl || null,
          imagePublicId: imagePublicId || null
        }, slug);

        if (res.success) {
          setStep('success');
          setTimeout(() => { if (onComplete) onComplete(res.data); }, 1500);
        }
      } catch (err) {
        setStep('confirm');
        setErrorMsg(err.response?.data?.message || err.message || 'Failed to record expense');
      }
    } else if (type === 'payment' || type === 'purchase_payment') {
      const validItems = receiptItems.filter(item => item.selectedId && parseFloat(item.amount) > 0);

      if (validItems.length === 0) {
        setErrorMsg(`Please select at least one matched ${type === 'purchase_payment' ? 'purchase' : 'invoice'} with a valid payment amount (> 0).`);
        return;
      }

      setLoadingMsg(`Updating balances for ${validItems.length} bill(s)...`);
      setStep('processing');

      try {
        const results = await Promise.all(
          validItems.map(item => {
            if (type === 'purchase_payment') {
              return createPurchasePaymentApi({
                purchaseId: item.selectedId,
                amount: parseFloat(item.amount),
                receiptImageUrl: imageUrl || 'https://res.cloudinary.com/demo/image/upload/sample_receipt.jpg',
                receiptImagePublicId: imagePublicId || 'sample_receipt'
              }, slug);
            } else {
              return createPaymentApi({
                invoiceId: item.selectedId,
                amount: parseFloat(item.amount),
                receiptImageUrl: imageUrl || 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                receiptImagePublicId: imagePublicId || 'sample'
              }, slug);
            }
          })
        );

        if (results.every(r => r.success)) {
          setStep('success');
          setTimeout(() => { if (onComplete) onComplete(results.map(r => r.data)); }, 1500);
        }
      } catch (err) {
        setStep('confirm');
        setErrorMsg(err.response?.data?.message || err.message || 'Failed to record receipt settlement');
      }
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'purchase': return 'Capture Purchase Bill';
      case 'purchase_payment': return 'Capture Purchase Payment Receipt';
      case 'expense': return 'Record Factory Expense';
      case 'payment': return 'Capture Sales Payment Receipt';
      default: return 'Capture Digital Sales Invoice';
    }
  };

  return (
    <div className="bg-neutral-card rounded-[12px] shadow-level-3 border border-neutral-border p-6 max-w-xl mx-auto font-sans animate-in fade-in duration-200">
      {/* Step 1: Camera / Photo Capture */}
      {step === 'camera' && (
        <div className="text-center space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-divider pb-3">
            <h3 className="text-[18px] font-bold text-neutral-primary flex items-center gap-2">
              <span>📷</span> {getTitle()}
            </h3>
            {onCancel && (
              <button onClick={onCancel} className="text-[14px] text-neutral-tertiary hover:text-neutral-primary font-bold">
                ✕ Close
              </button>
            )}
          </div>

          <p className="text-[13px] text-neutral-secondary font-medium">
            {type === 'purchase'
              ? 'Point camera at supplier purchase invoice photo'
              : type === 'purchase_payment'
              ? 'Point camera at supplier payment receipt / voucher'
              : type === 'expense'
              ? 'Point camera at expense bill slip (optional)'
              : type === 'payment'
              ? 'Point camera at sales payment receipt'
              : 'Point camera at printed or handwritten bill photo'}
          </p>

          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-brand-primary/40 rounded-[10px] cursor-pointer bg-brand-primary/5 hover:bg-brand-primary/10 transition active:scale-[0.99]">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 bg-brand-primary/10 rounded-full flex items-center justify-center text-3xl mb-2 text-brand-primary">
                📷
              </div>
              <span className="text-[14px] font-semibold text-brand-primary">Take Photo / Upload Image</span>
              <span className="text-[11px] text-neutral-tertiary mt-1">Camera active (`capture="environment"`)</span>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </label>

          {type === 'expense' && (
            <button
              type="button"
              onClick={() => setStep('confirm')}
              className="text-[13px] text-brand-primary font-semibold hover:underline"
            >
              Skip Photo & Enter Expense Directly ➔
            </button>
          )}
        </div>
      )}

      {/* Step 2: Processing Overlay */}
      {step === 'processing' && (
        <div className="text-center py-10 space-y-4">
          <div className="inline-block animate-spin text-4xl text-brand-primary mb-2">
            <svg className="w-10 h-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-[16px] font-bold text-neutral-primary">{loadingMsg}</h3>
          <p className="text-[13px] text-neutral-secondary font-medium">Extracting data with AI...</p>
        </div>
      )}

      {/* Step 3: Confirmation Screen */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-divider pb-3">
            <h3 className="text-[16px] font-bold text-neutral-primary flex items-center gap-2">
              <span>✍️</span> Confirm {type === 'purchase' ? 'Purchase Bill' : type === 'purchase_payment' ? 'Purchase Payment Receipt' : type === 'expense' ? 'Expense' : 'Details'}
            </h3>
            {confidence && (
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-[4px] border ${
                confidence === 'high' ? 'bg-semantic-success-bg text-semantic-success-text border-semantic-success-border' : 'bg-semantic-warning-bg text-semantic-warning-text border-semantic-warning-border'
              }`}>
                OCR: {confidence}
              </span>
            )}
            {onCancel && (
              <button onClick={onCancel} className="text-[14px] text-neutral-tertiary hover:text-neutral-primary font-bold">
                ✕ Close
              </button>
            )}
          </div>

          {/* Photo Thumbnail */}
          {previewUrl && (
            <div className="p-3 border border-neutral-border rounded-[10px] bg-neutral-bg flex items-center gap-3">
              <img src={previewUrl} alt="Bill Thumbnail" className="h-14 w-14 object-cover rounded-[6px] border border-neutral-border shadow-level-1" />
              <div className="text-left text-[13px]">
                <span className="font-semibold text-neutral-primary block">Uploaded Document Photo</span>
                <span className="text-[11px] text-neutral-tertiary block truncate max-w-[200px]">{selectedFile?.name}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-semantic-error-bg border border-semantic-error-border text-semantic-error-text text-[13px] font-semibold rounded-[8px]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3">
            {type === 'invoice' || type === 'purchase' ? (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-secondary mb-1">
                    {type === 'purchase' ? 'Purchase Bill Number' : 'Bill Number'} <span className="text-semantic-error-text">*</span>
                  </label>
                  <input
                    type="text"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary uppercase font-medium"
                    placeholder={type === 'purchase' ? 'e.g. PUR-501' : 'e.g. INV-1001'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-neutral-secondary mb-1">
                    {type === 'purchase' ? 'Supplier Name' : 'Customer Name'} <span className="text-semantic-error-text">*</span>
                  </label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary font-medium"
                    placeholder={type === 'purchase' ? 'e.g. National Timber Corp' : 'e.g. Ramesh Furniture'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-neutral-secondary mb-1">
                    Total Amount (₹) <span className="text-semantic-error-text">*</span>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary font-bold"
                    placeholder="e.g. 25000"
                    required
                  />
                </div>
              </>
            ) : type === 'expense' ? (
              /* Expense Form */
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-secondary mb-1">
                    Expense Category <span className="text-semantic-error-text">*</span>
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary font-medium"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-neutral-secondary mb-1">
                    Expense Amount (₹) <span className="text-semantic-error-text">*</span>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary font-bold"
                    placeholder="e.g. 4500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-neutral-secondary mb-1">
                    Expense Date <span className="text-semantic-error-text">*</span>
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-neutral-secondary mb-1">
                    Description / Notes
                  </label>
                  <input
                    type="text"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full px-[12px] h-[48px] text-[15px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary font-medium"
                    placeholder="e.g. Factory electricity bill payment"
                  />
                </div>
              </>
            ) : (
              /* Receipt Settlement Form (Sales Payment or Purchase Payment) */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider">
                    {type === 'purchase_payment' ? 'Purchase Settlement Bills' : 'Sales Settlement Bills'} ({receiptItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[12px] font-semibold text-brand-primary hover:underline bg-brand-primary/10 px-2.5 py-1 rounded-[6px] border border-brand-primary/20"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {receiptItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-neutral-bg rounded-[10px] border border-neutral-border space-y-2 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-bold text-brand-primary">Item #{idx + 1}</span>
                        {receiptItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-[11px] text-semantic-error-text font-semibold hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-secondary mb-1">
                            Bill Number
                          </label>
                          <input
                            type="text"
                            value={item.billNo}
                            onChange={(e) => handleItemChange(idx, 'billNo', e.target.value)}
                            className="w-full px-[12px] h-[36px] text-[13px] rounded-[6px] border border-neutral-border focus:border-brand-primary focus:outline-none uppercase font-medium bg-white text-neutral-primary"
                            placeholder={type === 'purchase_payment' ? 'e.g. PUR-888' : 'e.g. BILL-101'}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-secondary mb-1">
                            Amount Cleared (₹)
                          </label>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                            className="w-full px-[12px] h-[36px] text-[13px] rounded-[6px] border border-neutral-border focus:border-brand-primary focus:outline-none font-bold bg-white text-neutral-primary"
                            placeholder="Amount"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-secondary mb-1">
                          Matched {type === 'purchase_payment' ? 'Supplier Purchase' : 'Customer Invoice'}
                        </label>
                        {item.matchedRecords.length > 0 ? (
                          <select
                            value={item.selectedId}
                            onChange={(e) => handleItemChange(idx, 'selectedId', e.target.value)}
                            className="w-full px-[12px] h-[36px] text-[13px] rounded-[6px] border border-neutral-border focus:border-brand-primary focus:outline-none font-medium bg-white text-neutral-primary"
                          >
                            {item.matchedRecords.map(rec => (
                              <option key={rec._id} value={rec._id}>
                                Bill #{rec.billNo} - {rec.customerName || rec.supplierName} (Pending: ₹{rec.amountPending?.toLocaleString('en-IN')})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[11px] text-semantic-warning-text bg-semantic-warning-bg p-2 rounded-[6px] border border-semantic-warning-border">
                            ⚠️ No automatic match for #{item.billNo || 'unknown'}.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('camera')}
                className="w-1/3 py-[12px] bg-neutral-bg text-neutral-primary hover:bg-neutral-border text-[14px] font-semibold rounded-[8px] transition"
              >
                Retake
              </button>
              <button
                type="submit"
                className="w-2/3 py-[12px] bg-brand-primary text-white text-[14px] font-semibold rounded-[8px] hover:bg-brand-secondary transition active:scale-[0.98] shadow-level-1"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Success Feedback */}
      {step === 'success' && (
        <div className="text-center py-8 space-y-3">
          <div className="w-16 h-16 bg-semantic-success-bg text-semantic-success-text border border-semantic-success-border rounded-full flex items-center justify-center text-3xl mx-auto animate-in zoom-in duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-[18px] font-bold text-neutral-primary">
            {type === 'purchase' ? 'Purchase Record Saved!' : type === 'purchase_payment' ? 'Purchase Settlement Saved!' : type === 'expense' ? 'Factory Expense Recorded!' : 'Record Saved!'}
          </h3>
          <p className="text-[13px] text-neutral-secondary">
            Record successfully processed and saved.
          </p>
        </div>
      )}
    </div>
  );
}

export default CaptureFlow;
