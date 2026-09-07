import React from 'react';

export function StatusBadge({ status }) {
  switch (status) {
    case 'paid':
      return (
        <span className="bg-status-paid-bg text-status-paid-text text-[12px] font-medium px-[8px] py-[2px] rounded-[6px] inline-block">
          Paid
        </span>
      );
    case 'partially_paid':
      return (
        <span className="bg-status-partial-bg text-status-partial-text text-[12px] font-medium px-[8px] py-[2px] rounded-[6px] inline-block">
          Partial
        </span>
      );
    default:
      return (
        <span className="bg-status-pending-bg text-status-pending-text text-[12px] font-medium px-[8px] py-[2px] rounded-[6px] inline-block">
          Pending
        </span>
      );
  }
}

export default StatusBadge;
