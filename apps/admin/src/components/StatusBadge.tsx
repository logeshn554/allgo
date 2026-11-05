import React from 'react';

export function StatusBadge({ status }: { status: string }) {
  let bg = 'bg-gray-100 text-gray-800 border-gray-200';

  switch (status) {
    case 'ACTIVE':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'SUSPENDED':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'BLOCKED':
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'PENDING_VERIFICATION':
      bg = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.025em',
        border: '1px solid currentColor',
      }}
      className={bg}
    >
      {status}
    </span>
  );
}
