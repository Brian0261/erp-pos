import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "available" | "soldOut" | "store" | "accent" | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  available: "border-ink-success/20 bg-[#e9f8ef] text-ink-success",
  soldOut: "border-ink-alert/20 bg-[#fff0f4] text-ink-alert",
  store: "border-ink-primary/15 bg-[#eef6ff] text-ink-primary",
  accent: "border-ink-accent/50 bg-ink-accent/30 text-ink-primary",
  neutral: "border-ink-border bg-ink-soft text-ink-body",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-[0.08em]",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
