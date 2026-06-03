import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  selected?: boolean;
};

export function Chip({ children, className, selected = false, ...props }: ChipProps) {
  return (
    <button
      className={[
        "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 py-2 font-sans text-sm font-semibold transition-colors focus-visible:outline-ink-focus disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-ink-primary bg-ink-primary text-ink-white"
          : "border-ink-border bg-ink-white text-ink-primary hover:bg-ink-cream",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
