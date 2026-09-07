import React, { useState } from 'react';
import { setupPinApi } from '../../api/index.js';

export function SetupPinModal({ tenantSlug, onComplete }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    } else if (confirmPin.length < 4) {
      setConfirmPin(prev => prev + digit);
    }
  };

  const handleClear = () => {
    if (confirmPin.length > 0) {
      setConfirmPin('');
    } else {
      setPin('');
    }
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setErrorMsg('Please enter a 4-digit MPIN');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('MPIN and confirmation do not match');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await setupPinApi(pin, tenantSlug);
      if (res.success) {
        onComplete(pin);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to setup MPIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center text-2xl mx-auto font-black">
            🔒
          </div>
          <h2 className="text-xl font-black text-gray-900">Set 4-Digit MPIN</h2>
          <p className="text-xs text-gray-500 font-medium">
            Use this MPIN for fast 1-touch login next time on this device!
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4 text-center">
          <div>
            <span className="text-xs font-bold text-gray-600 block mb-1">
              {pin.length < 4 ? '1. Enter 4-Digit MPIN' : '2. Confirm 4-Digit MPIN'}
            </span>
            <div className="flex justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((idx) => {
                const currentVal = pin.length < 4 ? pin : confirmPin;
                const isFilled = currentVal.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      isFilled
                        ? 'border-brand-primary bg-brand-light text-brand-primary shadow-sm scale-105'
                        : 'border-gray-200 bg-gray-50 text-gray-300'
                    }`}
                  >
                    {isFilled ? '•' : ''}
                  </div>
                );
              })}
            </div>
            {pin.length === 4 && (
              <p className="text-[11px] text-brand-primary font-bold">
                Enter matching MPIN above to confirm
              </p>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num.toString())}
                className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 active:bg-gray-300 text-gray-800 font-extrabold text-lg transition active:scale-95 shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-xl bg-gray-200 hover:bg-gray-300 focus:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 active:scale-95 text-gray-700 font-bold text-xs transition flex items-center justify-center"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 active:bg-gray-300 text-gray-800 font-extrabold text-lg transition active:scale-95 shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
              onClick={handleSubmit}
              className={`h-12 rounded-xl text-white font-bold text-xs transition flex items-center justify-center shadow-md ${
                pin.length === 4 && confirmPin.length === 4
                  ? 'bg-brand-primary hover:bg-brand-secondary focus:bg-brand-secondary focus:outline-none focus:ring-4 focus:ring-brand-primary/30 active:scale-95'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Saving...' : 'Set MPIN ➔'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SetupPinModal;
