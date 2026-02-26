import { type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export default function TextArea({
  label,
  className = "",
  ...props
}: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-text-secondary tracking-wide uppercase">
          {label}
        </label>
      )}
      <textarea
        autoComplete="off"
        spellCheck={false}
        className={`
          w-full bg-surface-0 border border-border rounded-lg
          px-4 py-3 text-sm text-text-primary placeholder:text-text-muted
          focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20
          resize-none transition-colors font-body
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
