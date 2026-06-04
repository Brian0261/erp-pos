import type { HTMLAttributes } from "react";

export type BottomNavigationProps = HTMLAttributes<HTMLElement> & {
  activeItem?: "inicio" | "categorias" | "buscar" | "tiendas";
};

const items = [
  {
    id: "inicio" as const,
    label: "Inicio",
    icon: (
      <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "categorias" as const,
    label: "Categorías",
    icon: (
      <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: "buscar" as const,
    label: "Buscar",
    icon: (
      <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: "tiendas" as const,
    label: "Tiendas",
    icon: (
      <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-10a2 2 0 11-4 0 2 2 0 014 0zM3 10h18M5 21h14" />
      </svg>
    ),
  },
];

export function BottomNavigation({ activeItem, className, ...props }: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegación inferior"
      className={[
        "fixed inset-x-0 bottom-0 z-50 border-t border-ink-border bg-ink-white pb-[env(safe-area-inset-bottom,0px)] md:hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={[
                "flex min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors focus-visible:outline-ink-focus",
                isActive ? "text-ink-primary" : "text-ink-muted hover:text-ink-body",
              ].join(" ")}
              key={item.id}
              type="button"
            >
              <span className={isActive ? "text-ink-primary" : undefined}>{item.icon}</span>
              <span className="font-sans text-[11px] font-semibold leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
