import React, { useState } from 'react';

export function OcrConfirm({ ocrData, previewUrl, type = 'invoice', onConfirm, onCancel, loading }) {
  const [billNo, setBillNo] = useState(ocrData?.billNo || '');
  const [partyName, setPartyName] = useState(ocrData?.name || '');
  const [amount, setAmount] = useState(ocrData?.amount ? ocrData.amount.toString() : '');
  const [category, setCategory] = useState('electricity');

  const getPartyLabel = () => {
    switch (type) {
      case 'purchase':
        return 'Supplier Name';
      case 'expense':
        return 'Expense Category & Description';
      default:
        return 'Customer Name';
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      billNo: billNo.trim(),
      partyName: partyName.trim(),
      amount: parseFloat(amount) || 0,
      category,
      ocrResult: ocrData
    });
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 space-y-4 font-sans max-w-sm mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Step 2 of 2</span>
          <h2 className="text-base font-black text-gray-900">Confirm Extracted Details</h2>
        </div>

        {onCancel && (
          <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600 p-2">
            ✕ Cancel
          </button>
        )}
      </div>

      {/* Image Thumbnail & Confidence Badge */}
      <div className="flex gap-3 items-center bg-purple-50/60 p-2.5 rounded-2xl border border-purple-100">
        {previewUrl && (
          <img src={previewUrl} alt="Document" className="w-14 h-14 object-cover rounded-xl border border-purple-200 shrink-0" />
        )}

        <div>
          <span className="text-[10px] font-bold text-purple-900 uppercase block">OCR Reading Verified</span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
            ocrData?.confidence === 'high' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            Confidence: {ocrData?.confidence || 'High'}
          </span>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleFormSubmit} className="space-y-3">
        {type !== 'expense' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Bill / Document No *</label>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              placeholder="e.g. INV-1001"
              className="w-full px-3 py-2 text.base font-bold rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none bg-white"
              required
            />
          </div>
        )}

        {type === 'expense' ? (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Expense Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-base font-bold rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="raw_material">Raw Material</option>
              <option value="electricity">Electricity</option>
              <option value="salary">Salary / Labor</option>

              <option value="rent">Rent</option>
              <option value="maintenance">Maintenance</option>
              <option value="transport">Transport</option>
              <option value="other">Other</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">{getPartyLabel()} *</label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. Ramesh Furniture"
              className="w-full px-3 py-2 text-base font-semibold rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none bg-white"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {type === 'payment' || type === 'purchase_payment' ? 'Payment Cleared Amount (₹) *' : 'Total Bill Amount (₹) *'}
          </label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 text-base font-black rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none bg-white text-primary"
            required
          />
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-3 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl active:scale-[0.97] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-2/3 py-3 bg-primary text-white text-xs font-extrabold rounded-xl shadow-md hover:bg-primary-dark active:scale-[0.97] transition"
          >
            {loading ? 'Saving...' : '💾 Save Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OcrConfirm;
