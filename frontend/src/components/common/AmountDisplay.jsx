import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export function AmountDisplay({ amount, className = '', fallback = '—' }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <span className={`text-neutral-tertiary font-bold ${className}`}>{fallback}</span>;
  }

  if (amount === undefined || amount === null || isNaN(amount)) {
    return <span className={className}>₹ 0</span>;
  }

  return (
    <span className={className}>
      ₹ {Number(amount).toLocaleString('en-IN')}
    </span>
  );
}

export default AmountDisplay;
