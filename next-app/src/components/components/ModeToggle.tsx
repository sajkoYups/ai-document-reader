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

export default function ModeToggle() {
  const processingMode = useAiStore((s) => s.processingMode);
  const apiAvailable = useAiStore((s) => s.apiAvailable);
  const setMode = useAiStore((s) => s.setProcessingMode);

  return (
    <div className="flex items-center gap-1.5 p-1 bg-surface-2 border border-border rounded-lg">
      {modes.map((mode) => {
        const isActive = processingMode === mode.id;
        const isDisabled = mode.id === "api" && apiAvailable === false;

        return (
          <button
            key={mode.id}
            onClick={() => !isDisabled && setMode(mode.id)}
            disabled={isDisabled}
            className={`
              relative flex flex-col items-start px-3 py-1.5 rounded-md
              text-left transition-all duration-150 cursor-pointer
              ${
                isActive
                  ? "bg-surface-0 shadow-sm border border-border"
                  : "hover:bg-surface-3 border border-transparent"
              }
              ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
            `}
          >
            <span
              className={`text-xs font-medium ${isActive ? "text-text-primary" : "text-text-secondary"}`}
            >
              {mode.label}
            </span>
            <span className="text-[10px] text-text-muted leading-tight">
              {mode.description}
            </span>
            {mode.id === "api" && apiAvailable === false && (
              <span className="text-[9px] text-warning mt-0.5">Unavailable</span>
            )}
            {mode.id === "api" && isActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
