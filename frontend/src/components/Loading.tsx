interface LoadingProps {
  message?: string;
  className?: string;
}

export function Loading({ message = 'Loading...', className = '' }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-700" />
      {message && <p className="mt-3 text-sm text-gray-500 font-medium">{message}</p>}
    </div>
  );
}

export default Loading;
