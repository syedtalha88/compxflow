import React, { useState } from 'react';
import { loginUser, setAccessToken } from '../../api/index.js';

export function LoginView({ onLoginSuccess }) {
  const [mode, setMode] = useState('email'); // 'email' | 'pin'
  const [slug, setSlug] = useState('kaleem');
  const [email, setEmail] = useState('kaleem@factflow.app');
  const [password, setPassword] = useState('Password123!');
  const [pin, setPin] = useState('');
  const [userId, setUserId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await loginUser({ email, password, slug });
      if (res.success) {
        setAccessToken(res.data.accessToken);
        if (onLoginSuccess) {
          onLoginSuccess({
            user: res.data.user,
            tenant: res.data.tenant,
            role: res.data.role
          });
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = (targetRole) => {
    if (targetRole === 'admin') {
      setEmail('kaleem@factflow.app');
      setPassword('Password123!');
    } else {
      setEmail('worker@factflow.app');
      setPassword('Password123!');
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-neutral-card p-6 rounded-[12px] shadow-level-3 border border-neutral-border font-sans my-8 animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary font-black rounded-[10px] flex items-center justify-center text-2xl mx-auto mb-2">
          F
        </div>
        <h2 className="text-[24px] font-black text-brand-primary">FactFlow</h2>
        <p className="text-[13px] text-neutral-tertiary mt-1">Factory Invoice & Expense Tracking</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-neutral-bg p-1 rounded-[10px] mb-4 text-[13px] font-semibold border border-neutral-border">
        <button
          onClick={() => setMode('email')}
          className={`flex-1 py-1.5 rounded-[8px] transition ${mode === 'email' ? 'bg-white text-neutral-primary shadow-level-1' : 'text-neutral-tertiary hover:text-neutral-secondary'}`}
        >
          Email & Password
        </button>
        <button
          onClick={() => setMode('pin')}
          className={`flex-1 py-1.5 rounded-[8px] transition ${mode === 'pin' ? 'bg-white text-neutral-primary shadow-level-1' : 'text-neutral-tertiary hover:text-neutral-secondary'}`}
        >
          4-Digit PIN
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 mb-4 bg-semantic-error-bg border border-semantic-error-border text-semantic-error-text text-[13px] font-semibold rounded-[8px]">
          {errorMsg}
        </div>
      )}

      {mode === 'email' ? (
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-neutral-secondary mb-1">Factory Subdomain / Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-[12px] h-[44px] text-[14px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-neutral-secondary mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-[12px] h-[44px] text-[14px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-neutral-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-[12px] h-[44px] text-[14px] rounded-[8px] border-[1.5px] border-neutral-border focus:border-brand-primary focus:outline-none bg-white text-neutral-primary placeholder:text-neutral-tertiary"
              required
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickRole('admin')}
              className="flex-1 py-[8px] bg-brand-primary/10 text-brand-primary text-[12px] font-semibold rounded-[6px] border border-brand-primary/20 hover:bg-brand-primary/20 transition"
            >
              Fill Admin Creds
            </button>
            <button
              type="button"
              onClick={() => handleQuickRole('member')}
              className="flex-1 py-[8px] bg-neutral-bg text-neutral-secondary text-[12px] font-semibold rounded-[6px] border border-neutral-border hover:bg-neutral-border transition"
            >
              Fill Member Creds
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] bg-brand-primary text-white text-[15px] font-semibold rounded-[8px] hover:bg-brand-secondary transition active:scale-[0.98] shadow-level-1 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      ) : (
        // PIN Pad Mode
        <div className="space-y-4 text-center">
          <p className="text-[13px] text-neutral-tertiary">Fast 4-Digit Factory Floor Login</p>
          <div className="flex justify-center gap-2 my-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-10 h-12 rounded-[10px] border-[1.5px] flex items-center justify-center text-xl font-bold ${
                  pin.length > idx ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-neutral-border bg-neutral-bg text-neutral-tertiary'
                }`}
              >
                {pin.length > idx ? '•' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => pin.length < 4 && setPin(pin + num)}
                className="w-14 h-12 rounded-[10px] bg-neutral-bg border border-neutral-border hover:bg-neutral-divider text-neutral-primary font-bold text-lg active:scale-95 transition"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              className="w-14 h-12 rounded-[10px] bg-neutral-bg border border-neutral-border hover:bg-neutral-divider text-neutral-secondary font-bold text-[12px] active:scale-95 transition"
            >
              Clear
            </button>
            <button
              onClick={() => pin.length < 4 && setPin(pin + '0')}
              className="w-14 h-12 rounded-[10px] bg-neutral-bg border border-neutral-border hover:bg-neutral-divider text-neutral-primary font-bold text-lg active:scale-95 transition"
            >
              0
            </button>
            <button
              onClick={() => handleEmailLogin({ preventDefault: () => {} })}
              className="w-14 h-12 rounded-[10px] bg-brand-primary text-white font-bold text-[12px] active:scale-95 transition hover:bg-brand-secondary shadow-level-1"
            >
              GO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginView;
