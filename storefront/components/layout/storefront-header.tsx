import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type StorefrontHeaderProps = {
  children?: ReactNode;
};

export function StorefrontHeader({ children }: StorefrontHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-border bg-ink-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo real de InkToy */}
        <Link
          aria-label="InkToy - Inicio"
          className="flex shrink-0 items-center focus-visible:outline-ink-focus"
          href="/"
        >
          <Image
            alt="InkToy"
            className="h-9 w-auto object-contain"
            height={36}
            priority
            src="/assets/images/brand/logo-inktoy.png"
            width={120}
          />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Navegación principal" className="hidden items-center gap-1 md:flex">
          {[
            { href: "/", label: "Inicio" },
            { href: "/categorias", label: "Categorías" },
            { href: "/buscar", label: "Buscar" },
            { href: "/tiendas", label: "Tiendas" },
          ].map((item) => (
            <Link
              key={item.href}
              className="rounded-ink px-3 py-2 font-sans text-sm font-semibold text-ink-primary transition-colors hover:bg-ink-soft focus-visible:outline-ink-focus"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions: search visual + menu placeholder */}
        <div className="flex items-center gap-2">
          <button
            aria-label="Buscar"
            className="inline-flex size-11 items-center justify-center rounded-ink text-ink-primary transition-colors hover:bg-ink-soft focus-visible:outline-ink-focus"
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            aria-label="Menú"
            className="inline-flex size-11 items-center justify-center rounded-ink text-ink-primary transition-colors hover:bg-ink-soft focus-visible:outline-ink-focus md:hidden"
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {children}
    </header>
  );
}
