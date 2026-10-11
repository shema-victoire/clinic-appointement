interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({ message = 'Nothing here yet', className = '' }: EmptyStateProps) {
  return (
    <div className={`rounded-lg border border-dashed border-gray-300 p-8 text-center bg-white ${className}`}>
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
}

export default EmptyState;
