interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
}

export default function ProgressBar({
  progress,
  label,
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{label}</span>
          <span className="text-text-muted font-mono">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
