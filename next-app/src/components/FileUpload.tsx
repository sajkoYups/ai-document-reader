import { useState, useRef, type DragEvent, type ChangeEvent, type HTMLAttributes } from "react";

interface FileUploadProps extends HTMLAttributes<HTMLDivElement> {
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export default function FileUpload({
  onFile,
  accept = ".pdf,.txt,.md",
  disabled = false,
  className,
  ...divProps
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items.length > 0) setDragging(true);
  };

  const handleDragOut = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      {...divProps}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8
        flex flex-col items-center justify-center gap-3
        transition-all duration-200 cursor-pointer
        ${
          dragging
            ? "border-accent bg-accent-dim scale-[1.01]"
            : "border-border hover:border-text-muted hover:bg-surface-2/50"
        }
        ${disabled ? "opacity-40 pointer-events-none" : ""}
        ${className ?? ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center text-text-muted">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-sm text-text-secondary">
          <span className="text-accent font-medium">Add a file</span> or
          drag and drop
        </p>
        <p className="text-xs text-text-muted mt-1">PDF, TXT, or Markdown (up to 50MB)</p>
      </div>
    </div>
  );
}
