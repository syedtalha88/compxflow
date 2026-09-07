import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import api from '../api/index.js';
import SetupPinModal from '../components/auth/SetupPinModal.jsx';

export function LoginView() {
  const navigate = useNavigate();
  const { login, loginWithToken } = useAuth();
  const { tenantSlug, setTenantSlug } = useTenant();

  const [savedProfile, setSavedProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('factflow_saved_profile')) || null;
    } catch (e) {
      return null;
    }
  });

  const [loginMode, setLoginMode] = useState(savedProfile ? 'pin' : 'password'); // 'password' | 'pin'

  // Password Login State
  const [email, setEmail] = useState(savedProfile?.email || '');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState(savedProfile?.tenantSlug || tenantSlug || 'kaleem');

  // PIN Login State
  const [pin, setPin] = useState('');

  // Setup MPIN Modal State
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [pendingAuthSession, setPendingAuthSession] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const saveDeviceProfile = (userData, tenantData, roleData) => {
    const profile = {
      userId: userData.id || userData._id,
      email: userData.email,
      tenantSlug: tenantData.slug,
      tenantName: tenantData.name,
      role: roleData
    };
    localStorage.setItem('factflow_saved_profile', JSON.stringify(profile));
    setSavedProfile(profile);
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const activeSlug = slug || tenantSlug || 'kaleem';
      if (activeSlug) setTenantSlug(activeSlug);

      const res = await login({ email, password, slug: activeSlug });
      if (res && res.success && res.data) {
        const { user, tenant, role, hasPin } = res.data;
        saveDeviceProfile(user, tenant, role);

        if (!hasPin) {
          // Trigger first-time MPIN setup modal
          setPendingAuthSession(res.data);
          setShowSetupPin(true);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinDigit = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');
      if (newPin.length === 4) {
        executePinLogin(newPin);
      }
    }
  };

  const handlePinClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const executePinLogin = async (pinValue) => {
    if (!savedProfile || !savedProfile.userId) {
      setErrorMsg('No saved profile found. Please sign in with password first.');
      setLoginMode('password');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const targetSlug = savedProfile.tenantSlug || tenantSlug || 'kaleem';
      const res = await api.post('/auth/pin-login', {
        pin: pinValue,
        userId: savedProfile.userId,
        slug: targetSlug
      }, {
        headers: { 'x-tenant-slug': targetSlug }
      });

      if (res.data?.success && res.data?.data?.accessToken) {
        // Use AuthContext to properly set all auth state (user, role, tenant, token)
        loginWithToken(res.data.data);
        saveDeviceProfile(res.data.data.user, res.data.data.tenant, res.data.data.role);
        if (targetSlug) setTenantSlug(targetSlug);
        navigate('/');
      }
    } catch (err) {
      setPin('');
      setErrorMsg(err.response?.data?.message || err.message || 'PIN Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPinComplete = (newPin) => {
    setShowSetupPin(false);
    navigate('/');
  };

  const handleClearSavedAccount = () => {
    localStorage.removeItem('factflow_saved_profile');
    setSavedProfile(null);
    setLoginMode('password');
    setEmail('');
    setPassword('');
    setPin('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center text-2xl mx-auto font-black shadow-inner">
            ⚡
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">FactFlow</h1>
          <p className="text-xs text-gray-500 font-semibold">Factory Operations & Billing System</p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
          {savedProfile && (
            <button
              type="button"
              onClick={() => setLoginMode('pin')}
              className={`flex-1 py-2 rounded-lg transition min-h-[40px] focus:outline-none focus:ring-2 focus:ring-brand-primary/50 ${
                loginMode === 'pin' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              🔒 1-Touch MPIN
            </button>
          )}
          <button
            type="button"
            onClick={() => setLoginMode('password')}
            className={`flex-1 py-2 rounded-lg transition min-h-[40px] focus:outline-none focus:ring-2 focus:ring-brand-primary/50 ${
              loginMode === 'password' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            🔑 Password Login
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {loginMode === 'pin' && savedProfile ? (
          /* Fast 4-Digit MPIN Mode */
          <div className="space-y-4 text-center">
            <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl flex items-center justify-between">
              <div className="text-left overflow-hidden">
                <span className="text-[10px] font-bold uppercase text-brand-primary tracking-wider">Remembered Account</span>
                <p className="text-xs font-black text-gray-900 truncate">{savedProfile.email}</p>
                <p className="text-[11px] text-gray-500 font-semibold capitalize">{savedProfile.tenantName} ({savedProfile.tenantSlug})</p>
              </div>
              <button
                type="button"
                onClick={handleClearSavedAccount}
                className="text-[11px] text-rose-600 font-bold hover:underline shrink-0"
              >
                Switch Account
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Enter 4-Digit Quick MPIN</label>
              <div className="flex justify-center gap-3 my-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      pin.length > idx
                        ? 'border-brand-primary bg-brand-light text-brand-primary shadow-sm scale-105'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {pin.length > idx ? '•' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinDigit(num.toString())}
                  disabled={loading}
                  className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 active:bg-gray-300 text-gray-800 font-extrabold text-lg transition active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinClear}
                disabled={loading}
                className="h-12 rounded-xl bg-gray-200 hover:bg-gray-300 focus:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-gray-700 font-bold text-xs active:scale-95 transition flex items-center justify-center"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handlePinDigit('0')}
                disabled={loading}
                className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 active:bg-gray-300 text-gray-800 font-extrabold text-lg transition active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('password')}
                className="h-12 rounded-xl bg-brand-light hover:bg-brand-light/80 focus:bg-brand-light/80 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-primary font-bold text-[11px] active:scale-95 transition flex items-center justify-center text-center px-1"
              >
                Password
              </button>
            </div>
            {loading && <p className="text-xs text-brand-primary font-bold animate-pulse">Authenticating PIN...</p>}
          </div>
        ) : (
          /* Password Login Mode */
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Factory Workspace Slug *</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. kaleem"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none font-bold lowercase bg-white"
                  required
                />
                <span className="text-xs text-gray-400 font-bold ml-2 shrink-0">.factflow.app</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kaleem@wood.com"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none font-medium bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none font-mono bg-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-primary hover:bg-brand-secondary focus:bg-brand-secondary focus:outline-none focus:ring-4 focus:ring-brand-primary/30 text-white text-sm font-bold rounded-xl shadow-md transition active:scale-[0.97]"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace ➔'}
            </button>
          </form>
        )}
      </div>

      {/* Setup MPIN Modal Trigger */}
      {showSetupPin && (
        <SetupPinModal
          tenantSlug={slug || tenantSlug || 'kaleem'}
          onComplete={handleSetupPinComplete}
        />
      )}
    </div>
  );
}

export default LoginView;
