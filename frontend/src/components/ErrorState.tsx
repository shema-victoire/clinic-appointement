interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, retry, className = '' }: ErrorStateProps) {
  const handleRetry = onRetry ?? retry;
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="font-medium">{message}</p>
        {handleRetry && (
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 transition cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
