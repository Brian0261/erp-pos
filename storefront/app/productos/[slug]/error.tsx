"use client";

import Link from "next/link";

export default function ProductDetailError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-cream px-4 py-16">
      <section className="w-full max-w-lg rounded-ink border border-ink-border bg-ink-white p-6 text-center shadow-ink-soft">
        <p className="font-sans text-sm font-bold uppercase tracking-[0.18em] text-ink-alert">
          Producto no disponible
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-ink-primary">
          No pudimos cargar este producto
        </h1>
        <p className="mt-3 font-sans text-base leading-7 text-ink-body">
          Intenta nuevamente mas tarde o vuelve al inicio de InkToy.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-ink bg-ink-primary px-5 py-3 font-sans font-semibold text-ink-white transition-colors hover:bg-[#12395f] focus-visible:outline-ink-focus"
            onClick={reset}
            type="button"
          >
            Reintentar
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-ink border border-ink-primary bg-ink-white px-5 py-3 font-sans font-semibold text-ink-primary transition-colors hover:bg-ink-cream focus-visible:outline-ink-focus"
            href="/"
          >
            Volver a inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
