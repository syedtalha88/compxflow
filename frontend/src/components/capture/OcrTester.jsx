import React, { useState } from 'react';
import { loginUser, extractOcr, getAccessToken } from '../../api/index.js';

export function OcrTester() {
  const [slug, setSlug] = useState('kaleem');
  const [email, setEmail] = useState('kaleem@compxflow.com');
  const [password, setPassword] = useState('Password123!');
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAccessToken()));
  const [authMsg, setAuthMsg] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [docType, setDocType] = useState('invoice');
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthMsg('');
    setErrorMsg('');
    try {
      const res = await loginUser({ email, password, slug });
      if (res.success) {
        setIsLoggedIn(true);
        setAuthMsg(`Authenticated as ${res.data.user.email} (${res.data.role})`);
      }
    } catch (err) {
      setAuthMsg(`Login failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrResult(null);
      setErrorMsg('');
    }
  };

  const handleOcrSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a bill image file first');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOcrResult(null);

    try {
      const res = await extractOcr(selectedFile, docType, slug);
      if (res.success) {
        setOcrResult(res.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'OCR processing failed');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'high':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">High Confidence</span>;
      case 'medium':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Medium Confidence</span>;
      case 'low':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Low Confidence</span>;
      default:
        return <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Manual Review Needed</span>;
    }
  };

  return (
    <div className="max-w-xl mx-auto my-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 font-sans">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <span>📷</span> CompXFlow OCR Tester (Phase 3)
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Upload handwritten factory bills -> Cloudinary stream -> Google Vision OCR -> Text Extraction
        </p>
      </div>

      {/* Auth Box */}
      <div className="mb-6 bg-purple-50/60 p-4 rounded-xl border border-purple-100">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">1. Tenant & Auth Session</h3>
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tenant Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition active:scale-[0.98]"
          >
            {isLoggedIn ? 'Re-authenticate Session' : 'Authenticate Session'}
          </button>
        </form>
        {authMsg && (
          <p className={`text-xs mt-2 font-medium ${authMsg.includes('failed') ? 'text-rose-600' : 'text-emerald-700'}`}>
            {authMsg}
          </p>
        )}
      </div>

      {/* Upload Form */}
      <form onSubmit={handleOcrSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">2. Upload Bill Image</label>
          <div className="flex gap-3 mb-3">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="invoice">Invoice / Sales Bill</option>
              <option value="purchase">Purchase Bill</option>
              <option value="payment">Receipt / Voucher</option>
              <option value="expense">Expense Receipt</option>
            </select>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-primary-mid/40 rounded-xl cursor-pointer bg-gray-50 hover:bg-purple-50/30 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-2xl mb-1">📸</span>
              <p className="text-xs text-gray-600 font-semibold">
                Click to browse or take photo
              </p>
              <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, JPEG or WEBP (Max 10MB)</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="mt-4 p-2 border border-gray-200 rounded-xl bg-gray-50 text-center">
            <img src={previewUrl} alt="Bill Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            <p className="text-[10px] text-gray-500 mt-1">{selectedFile?.name}</p>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedFile || !isLoggedIn}
          className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition disabled:opacity-50 active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Uploading to Cloudinary & Reading Text...</span>
            </>
          ) : (
            <span>🚀 Process Bill & Extract Text</span>
          )}
        </button>
      </form>

      {/* Results Display */}
      {ocrResult && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Extracted OCR Metadata</h4>
            {getConfidenceBadge(ocrResult.confidence)}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Bill No</span>
              <span className="text-xs font-bold text-gray-800">{ocrResult.billNo || '—'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Customer / Party</span>
              <span className="text-xs font-bold text-gray-800 truncate block">{ocrResult.name || '—'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="block text-[10px] text-gray-400 font-semibold uppercase">Amount</span>
              <span className="text-xs font-bold text-primary">
                {ocrResult.amount !== null ? `₹ ${ocrResult.amount.toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
          </div>

          {ocrResult.items && ocrResult.items.length > 0 && (
            <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1.5">
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Extracted Line Items ({ocrResult.items.length})
              </span>
              <div className="space-y-1">
                {ocrResult.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 bg-purple-50/50 rounded font-semibold text-gray-700">
                    <span>Bill #{item.billNo}</span>
                    <span className="text-emerald-700 font-bold">₹{item.amount?.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ocrResult.imageUrl && (
            <div className="pt-2 text-right">
              <a
                href={ocrResult.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                View Stored Cloudinary Image ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OcrTester;
