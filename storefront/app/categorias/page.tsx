import type { Metadata } from "next";
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
  name: string;
};

function CategoryCardPreview({ description, name }: CategoryCardPreviewProps) {
  return (
    <article className="grid overflow-hidden rounded-ink border border-ink-border bg-ink-white shadow-ink-soft sm:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
      <div className="relative min-h-36 bg-ink-soft">
        <div className="flex h-full min-h-36 items-center justify-center bg-[linear-gradient(135deg,var(--ink-accent),var(--ink-cream))] p-6">
          <span className="font-serif text-4xl font-bold text-ink-primary">{name.slice(0, 1)}</span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3 p-5">
        <h3 className="font-serif text-2xl font-bold leading-tight text-ink-primary">{name}</h3>
        {description ? <p className="font-sans text-sm leading-6 text-ink-body">{description}</p> : null}
        <p className="font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Detalle proximamente
        </p>
      </div>
    </article>
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
            <div className="grid gap-4 lg:grid-cols-2">
              {categories.items.map((category) => (
                <CategoryCardPreview
                  description={category.description}
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
