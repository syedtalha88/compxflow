import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSuperAdminKey, getSuperAdminKey, getDashboard } from '../../api/superAdminApi.js';

export default function KeyEntryPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const navigate = useNavigate();

  // If a valid key already exists in sessionStorage, skip to dashboard
  useEffect(() => {
    const existingKey = getSuperAdminKey();
    if (existingKey) {
      getDashboard()
        .then(() => navigate('/internal/dashboard', { replace: true }))
        .catch(() => setCheckingExisting(false));
    } else {
      setCheckingExisting(false);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;

    setError('');
    setLoading(true);

    // Store the key first so the API interceptor can use it
    setSuperAdminKey(key.trim());

    try {
      await getDashboard();
      navigate('/internal/dashboard', { replace: true });
    } catch (err) {
      sessionStorage.removeItem('sa_key');
      if (err.response?.status === 403) {
        setError('Invalid key. Access denied.');
      } else {
        setError(err.response?.data?.message || 'Connection failed. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm font-medium animate-pulse">Verifying session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600/20 rounded-2xl mb-4">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">CompXFlow Internal</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Platform Administration Panel</p>
        </div>

        {/* Key Entry Card */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
          <div>
            <label htmlFor="sa-key-input" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Super Admin Key
            </label>
            <input
              id="sa-key-input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your secret key"
              autoFocus
              autoComplete="off"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-600 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-violet-600/20"
          >
            {loading ? 'Verifying…' : 'Authenticate'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-700 mt-6 font-medium">
          This panel is restricted to platform operators only.
        </p>
      </div>
    </div>
  );
}
