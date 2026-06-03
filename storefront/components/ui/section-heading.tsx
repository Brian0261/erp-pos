import type { HTMLAttributes, ReactNode } from "react";

type HeadingLevel = "h1" | "h2" | "h3";

export type SectionHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  eyebrow?: string;
  level?: HeadingLevel;
  subtitle?: ReactNode;
  title: ReactNode;
};

const sizeClasses: Record<HeadingLevel, string> = {
  h1: "text-4xl leading-tight md:text-5xl",
  h2: "text-3xl leading-tight md:text-4xl",
  h3: "text-2xl leading-snug md:text-3xl",
};

export function SectionHeading({
  className,
  eyebrow,
  level = "h2",
  subtitle,
  title,
  ...props
}: SectionHeadingProps) {
  const Heading = level;

  return (
    <div className={["space-y-3", className].filter(Boolean).join(" ")}>
      {eyebrow ? (
        <p className="font-sans text-sm font-bold uppercase tracking-[0.18em] text-ink-alert">
          {eyebrow}
        </p>
      ) : null}
      <Heading
        className={["font-serif font-semibold text-ink-primary", sizeClasses[level]].join(" ")}
        {...props}
      >
        {title}
      </Heading>
      {subtitle ? <p className="max-w-2xl font-sans text-base text-ink-body">{subtitle}</p> : null}
    </div>
  );
}
