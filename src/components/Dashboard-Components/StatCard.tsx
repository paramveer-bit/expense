// components/StatCard.tsx
import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: 'green' | 'red' | 'neutral';
}) {
  const accentClass = accent === 'green' ? 'text-green-600' : accent === 'red' ? 'text-red-600' : 'text-gray-700';

  const display = typeof value === 'number'
    ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : String(value);

  return (
    <div className="p-4 rounded-lg bg-white shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-semibold mt-2 ${accentClass}`}>{display}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}
