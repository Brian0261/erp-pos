import type { ReactNode } from "react";
import { Button } from "@/components/ui";

export type EmptyStateAction = {
  href?: string;
  label: string;
  onClick?: never;
};

export type EmptyStateProps = {
  description: ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  title: string;
};

export function EmptyState({
  description,
  primaryAction,
  secondaryAction,
  title,
}: EmptyStateProps) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center rounded-ink border border-ink-border bg-ink-white px-6 py-12 text-center shadow-ink-soft">
      <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-ink-accent/30 text-ink-primary">
        <svg aria-hidden="true" className="size-14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" />
        </svg>
      </div>
      <h2 className="font-serif text-3xl font-semibold text-ink-primary">{title}</h2>
      <p className="mt-3 font-sans text-base leading-7 text-ink-body">{description}</p>
      {(primaryAction || secondaryAction) ? (
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {primaryAction ? (
            <Button className="w-full sm:w-auto" href={primaryAction.href ?? "#"}>
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button className="w-full sm:w-auto" href={secondaryAction.href ?? "#"} variant="ghost">
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
