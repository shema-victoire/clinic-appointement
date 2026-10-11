/**
 * StatusPill.tsx
 *
 * Renders a status badge with the correct color per WIREFRAMES.md:
 *   CONFIRMED → teal   COMPLETED → gray
 *   PENDING   → amber  FULFILLED → teal
 *   PATIENT   → gray   DOCTOR    → teal   ADMIN → amber
 */

type Status =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'PENDING'
  | 'FULFILLED'
  | 'PATIENT'
  | 'DOCTOR'
  | 'ADMIN';

const colorMap: Record<Status, string> = {
  CONFIRMED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  PENDING:   'bg-amber-100 text-amber-800',
  FULFILLED: 'bg-teal-100 text-teal-800',
  PATIENT:   'bg-gray-100 text-gray-700',
  DOCTOR:    'bg-teal-100 text-teal-800',
  ADMIN:     'bg-amber-100 text-amber-800',
};

interface StatusPillProps {
  status: Status;
  className?: string;
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const colors = colorMap[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors} ${className}`}
    >
      {status}
    </span>
  );
}
