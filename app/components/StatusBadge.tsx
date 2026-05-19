'use client';

interface StatusBadgeProps {
  status: 'FOUND' | 'NOT_FOUND' | 'PARTIAL' | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    FOUND: 'bg-green-900/40 text-green-400 border border-green-800',
    NOT_FOUND: 'bg-red-900/40 text-red-400 border border-red-800',
    PARTIAL: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  };

  const labels = {
    FOUND: '✓ FOUND',
    NOT_FOUND: '✗ NOT FOUND',
    PARTIAL: '~ PARTIAL',
  };

  const cls = styles[status as keyof typeof styles] || styles.NOT_FOUND;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${cls}`}>
      {label}
    </span>
  );
}
