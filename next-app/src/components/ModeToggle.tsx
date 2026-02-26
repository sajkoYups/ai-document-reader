import { useAiStore, type ProcessingMode } from "@/store/aiStore";

const modes: { id: ProcessingMode; label: string; description: string }[] = [
  {
    id: "local",
    label: "Standard",
    description: "On-device (0.5B)",
  },
  {
    id: "api",
    label: "Deep Analysis",
    description: "Encrypted API",
  },
];

interface ModeToggleProps {
  /** Compact single-line variant for header placement */
  compact?: boolean;
}

export default function ModeToggle({ compact = false }: ModeToggleProps) {
  const processingMode = useAiStore((s) => s.processingMode);
  const apiAvailable = useAiStore((s) => s.apiAvailable);
  const setMode = useAiStore((s) => s.setProcessingMode);

  return (
    <div
      className={`flex items-center gap-1.5 p-1 bg-surface-2 border border-border rounded-lg ${compact ? "rounded-md" : ""}`}
      role="group"
      aria-label="Processing mode"
    >
      {modes.map((mode) => {
        const isActive = processingMode === mode.id;
        const isDisabled = mode.id === "api" && apiAvailable === false;

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => !isDisabled && setMode(mode.id)}
            disabled={isDisabled}
            aria-pressed={isActive}
            aria-label={`${mode.label}: ${mode.description}`}
            title={isDisabled && mode.id === "api" ? "Deep Analysis unavailable (API not connected)" : undefined}
            className={`
              relative flex items-center rounded-md
              text-left transition-all duration-150 cursor-pointer
              ${
                isActive
                  ? "bg-surface-0 shadow-sm border border-border"
                  : "hover:bg-surface-3 border border-transparent"
              }
              ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
              ${compact ? "flex-row gap-1.5 px-2.5 py-1" : "flex-col items-start px-3 py-1.5"}
            `}
          >
            <span
              className={`font-medium ${isActive ? "text-text-primary" : "text-text-secondary"} ${compact ? "text-[11px] whitespace-nowrap" : "text-xs"}`}
            >
              {mode.label}
            </span>
            {!compact && (
              <span className="text-[10px] text-text-muted leading-tight">
                {mode.description}
              </span>
            )}
            {mode.id === "api" && apiAvailable === false && (
              <span
                className={`text-warning ${compact ? "text-[9px] ml-0.5" : "text-[9px] mt-0.5"}`}
              >
                Unavailable
              </span>
            )}
            {mode.id === "api" && isActive && (
              <span
                className="absolute rounded-full bg-accent"
                aria-hidden
                style={compact ? { width: 4, height: 4, top: 2, right: 2 } : { width: 8, height: 8, top: -4, right: -4 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
