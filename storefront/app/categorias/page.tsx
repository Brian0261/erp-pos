import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/catalog";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { Breadcrumbs, SectionHeading } from "@/components/ui";
import { getStorefrontCategories } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Categorias | InkToy",
  description: "Explora las categorias publicas del catalogo InkToy.",
};

type CategoryCardPreviewProps = {
  description?: string | null;
  href: string;
  name: string;
};

function CategoryCardPreview({ description, href, name }: CategoryCardPreviewProps) {
  return (
    <Link className="group block" href={href}>
      <article className="grid min-h-32 grid-cols-[minmax(112px,0.42fr)_minmax(0,0.58fr)] overflow-hidden rounded-ink border border-ink-border bg-ink-white shadow-ink-soft transition hover:-translate-y-0.5 sm:min-h-36 sm:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
        <div className="relative bg-ink-soft">
          <div className="flex h-full min-h-32 items-center justify-center bg-[linear-gradient(135deg,var(--ink-accent),var(--ink-cream))] p-4 sm:min-h-36 sm:p-6">
            <span className="font-serif text-3xl font-bold text-ink-primary sm:text-4xl">{name.slice(0, 1)}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2 p-4 sm:gap-3 sm:p-5">
          <h3 className="font-serif text-xl font-bold leading-tight text-ink-primary sm:text-2xl">{name}</h3>
          {description ? <p className="line-clamp-2 font-sans text-sm leading-5 text-ink-body sm:leading-6">{description}</p> : null}
          <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-ink-muted sm:text-xs">
            Ver productos
          </p>
        </div>
      </article>
    </Link>
  );
}

export default async function CategoriesPage() {
  const categories = await getStorefrontCategories({ page: 0, size: 50 });

  return (
    <>
      <StorefrontHeader />
      <main className="flex flex-1 flex-col gap-8 bg-ink-cream px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-7xl space-y-5">
          <Breadcrumbs
            items={[
              { href: "/", label: "Inicio" },
              { label: "Categorias" },
            ]}
          />
          <SectionHeading
            eyebrow="Explorar catalogo"
            level="h1"
            subtitle="Descubre nuestras categorias de papeleria, utiles escolares, manualidades y pasamaneria."
            title="Categorias InkToy"
          />
        </section>

        <section className="mx-auto w-full max-w-7xl" aria-label="Listado de categorias">
          {categories.items.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              {categories.items.map((category) => (
                <CategoryCardPreview
                  description={category.description}
                  href={`/categorias/${category.slug}`}
                  key={category.slug}
                  name={category.name}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Todavia no hay categorias disponibles. Vuelve pronto para explorar nuestras novedades."
              primaryAction={{ href: "/productos", label: "Ver productos" }}
              title="No hay categorias disponibles"
            />
          )}
        </section>
      </main>
      <StorefrontFooter />
      <BottomNavigation activeItem="categorias" />
    </>
  );
}
