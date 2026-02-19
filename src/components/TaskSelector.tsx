import type { TaskType } from "@/types";

interface TaskSelectorProps {
  selected: TaskType;
  onSelect: (task: TaskType) => void;
  disabled?: boolean;
}

const tasks: { id: TaskType; label: string; icon: string }[] = [
  { id: "summarize", label: "Summarize", icon: "⊞" },
  { id: "explain", label: "Explain", icon: "◇" },
  { id: "extract", label: "Extract", icon: "⊡" },
  { id: "draft", label: "Draft", icon: "✎" },
  { id: "chat", label: "Chat", icon: "◌" },
];

export default function TaskSelector({
  selected,
  onSelect,
  disabled = false,
}: TaskSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onSelect(task.id)}
          disabled={disabled}
          className={`
            inline-flex items-center gap-2 px-3.5 py-2 rounded-lg
            text-sm font-medium transition-all duration-150 cursor-pointer
            disabled:opacity-40 disabled:pointer-events-none
            ${
              selected === task.id
                ? "bg-accent text-surface-0 shadow-[0_0_12px_rgba(45,212,191,0.15)]"
                : "bg-surface-2 text-text-secondary border border-border hover:text-text-primary hover:bg-surface-3"
            }
          `}
        >
          <span className="font-mono text-xs opacity-70">{task.icon}</span>
          {task.label}
        </button>
      ))}
    </div>
  );
}
