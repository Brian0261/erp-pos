import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "inline-flex min-h-11 items-center justify-center rounded-ink font-sans font-semibold transition-colors focus-visible:outline-ink-focus disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-primary text-ink-white shadow-ink-soft hover:bg-[#12395f] active:bg-[#071a2d]",
  secondary:
    "border border-ink-primary bg-ink-white text-ink-primary hover:bg-ink-cream active:bg-ink-soft",
  ghost: "text-ink-primary hover:bg-ink-soft active:bg-ink-border",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "gap-2 px-3 py-2 text-sm",
  md: "gap-2.5 px-4 py-2.5 text-sm",
  lg: "gap-3 px-5 py-3 text-base",
};

type SharedButtonProps = {
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type ButtonAsButtonProps = SharedButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonAsLinkProps = SharedButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

function buttonClasses({
  className,
  size = "md",
  variant = "primary",
}: Pick<ButtonProps, "className" | "size" | "variant">) {
  return [baseClasses, variantClasses[variant], sizeClasses[size], className]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  const { children, className, size = "md", variant = "primary", ...rest } = props;
  const classes = buttonClasses({ className, size, variant });

  if ("href" in rest && rest.href) {
    const { href, ...anchorProps } = rest;
    return (
      <Link className={classes} href={href} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button {...buttonProps} className={classes} type={buttonProps.type ?? "button"}>
      {children}
    </button>
  );
}
