import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent text-surface-0 hover:brightness-110 active:brightness-95 shadow-[0_0_12px_rgba(45,212,191,0.15)]",
  secondary:
    "bg-surface-2 text-text-primary border border-border hover:bg-surface-3 active:bg-surface-2",
  ghost:
    "text-text-secondary hover:text-text-primary hover:bg-surface-2 active:bg-surface-3",
  danger:
    "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 active:bg-danger/10",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
};

export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg
        font-medium transition-all duration-150 cursor-pointer
        disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
