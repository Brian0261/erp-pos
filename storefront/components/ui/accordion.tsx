"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

export type AccordionItem = {
  content: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  title: string;
};

export type AccordionProps = {
  className?: string;
  items: AccordionItem[];
};

export function Accordion({ className, items }: AccordionProps) {
  const baseId = useId();

  return (
    <div className={["divide-y divide-ink-border", className].filter(Boolean).join(" ")}>
      {items.map((item, index) => (
        <AccordionPanel baseId={baseId} index={index} item={item} key={item.id ?? item.title} />
      ))}
    </div>
  );
}

function AccordionPanel({
  baseId,
  index,
  item,
}: {
  baseId: string;
  index: number;
  item: AccordionItem;
}) {
  const [open, setOpen] = useState(Boolean(item.defaultOpen));
  const panelId = `${baseId}-panel-${item.id ?? index}`;
  const buttonId = `${baseId}-button-${item.id ?? index}`;

  return (
    <section>
      <h3>
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left font-sans text-lg font-semibold text-ink-primary transition-colors hover:text-ink-alert focus-visible:outline-ink-focus"
          id={buttonId}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span>{item.title}</span>
          <svg
            aria-hidden="true"
            className={["size-5 shrink-0 transition-transform", open ? "rotate-180" : ""].join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h3>
      <div aria-labelledby={buttonId} hidden={!open} id={panelId} role="region">
        <div className="pb-5 font-sans text-sm leading-6 text-ink-body">{item.content}</div>
      </div>
    </section>
  );
}
