export default function AlertBanner({
  message,
  children,
  className,
}: {
  message?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400${className ? ` ${className}` : ""}`}
    >
      {children ?? message}
    </div>
  );
}
