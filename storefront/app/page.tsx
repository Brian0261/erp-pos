import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, ProductCard } from "@/components/catalog";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { Button, SectionHeading } from "@/components/ui";
import { getStorefrontCategories, getStorefrontProducts } from "@/lib/api";
import { getSafeImageAlt, getSafeImageSrc } from "@/lib/images";
import { buildStorefrontPublicUrl, getStorefrontRobotsMetadata } from "@/lib/seo";
import type { PublicCategoryListItemResponse, PublicProductListItemResponse } from "@/types/storefront";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "InkToy | Papeleria, utiles y creatividad",
  description: "Explora el catalogo publico InkToy de papeleria, utiles escolares, oficina y materiales creativos.",
  alternates: {
    canonical: buildStorefrontPublicUrl("/"),
  },
  robots: getStorefrontRobotsMetadata(),
};

const benefits = [
  {
    description: "Informacion publica conectada al catalogo InkToy.",
    title: "Catalogo en preparacion",
  },
  {
    description: "Opciones para clases, oficina, manualidades y detalles creativos.",
    title: "Escuela, oficina y creatividad",
  },
  {
    description: "Revisa el catalogo y consulta la disponibilidad final en tienda.",
    title: "Consulta en tienda",
  },
];

function getAvailabilityVariant(product: PublicProductListItemResponse) {
  const status = product.availability.status.toLowerCase();

  if (!product.availability.purchasable || status.includes("out") || status.includes("agot")) {
    return "soldOut" as const;
  }

  if (status.includes("store") || status.includes("tienda")) {
    return "store" as const;
  }

  return "available" as const;
}

function CategoryQuickLink({ category }: { category: PublicCategoryListItemResponse }) {
  return (
    <Link className="group block" href={`/categorias/${category.slug}`}>
      <article className="flex h-full flex-col items-center gap-3 rounded-ink border border-ink-border bg-ink-white p-4 text-center shadow-ink-soft transition hover:-translate-y-0.5 sm:p-5">
        <div className="flex size-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ink-accent),var(--ink-cream))] text-ink-primary shadow-sm sm:size-24">
          <span className="font-serif text-3xl font-bold sm:text-4xl">{category.name.slice(0, 1)}</span>
        </div>
        <div className="space-y-1">
          <h3 className="font-sans text-sm font-extrabold leading-tight text-ink-primary sm:text-base">
            {category.name}
          </h3>
          {category.description ? (
            <p className="line-clamp-2 font-sans text-xs leading-5 text-ink-body sm:text-sm">
              {category.description}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

function BenefitCard({ description, title }: { description: string; title: string }) {
  return (
    <article className="rounded-ink border border-ink-border bg-ink-white p-5 text-center shadow-ink-soft">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-ink-accent/40 text-ink-primary">
        <svg aria-hidden="true" className="size-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <h3 className="font-sans text-base font-extrabold text-ink-primary sm:text-lg">{title}</h3>
      <p className="mt-2 font-sans text-sm leading-6 text-ink-body">{description}</p>
    </article>
  );
}

export default async function Home() {
  const [categories, products] = await Promise.all([
    getStorefrontCategories({ page: 0, size: 6 }),
    getStorefrontProducts({ page: 0, size: 8 }),
  ]);

  return (
    <>
      <StorefrontHeader />
      <main className="flex flex-1 flex-col gap-10 bg-ink-cream px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] border border-ink-border bg-ink-primary text-ink-white shadow-ink-soft">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center lg:p-10">
            <div className="space-y-6">
              <p className="font-sans text-xs font-extrabold uppercase tracking-[0.28em] text-ink-accent">
                Catalogo publico InkToy
              </p>
              <div className="space-y-4">
                <h1 className="font-serif text-4xl font-black leading-none sm:text-5xl lg:text-6xl">
                  Papeleria, utiles escolares y creatividad para tu dia a dia
                </h1>
                <p className="max-w-2xl font-sans text-base leading-7 text-ink-white/85 sm:text-lg">
                  Explora productos para clases, oficina, manualidades y proyectos creativos desde el catalogo publico de InkToy.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="w-full bg-ink-accent text-ink-primary shadow-[0_10px_25px_rgba(255,209,102,0.28)] hover:bg-[#ffe095] sm:w-auto"
                  href="/productos"
                  size="lg"
                >
                  Explorar catalogo
                </Button>
                <Button className="border-ink-white bg-transparent text-ink-white hover:bg-ink-white/10" href="/categorias" size="lg" variant="secondary">
                  Ver categorias
                </Button>
              </div>
            </div>

            <div className="relative min-h-64 overflow-hidden rounded-[1.5rem] border border-ink-white/20 bg-ink-white/10 p-5">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-ink-accent/70 blur-2xl" />
              <div className="absolute -bottom-16 left-8 size-48 rounded-full bg-ink-white/20 blur-3xl" />
              <div className="relative grid h-full min-h-56 grid-cols-2 gap-2 sm:gap-3">
                {["Cuadernos", "Arte", "Oficina", "Creat."].map((label, index) => (
                  <div
                    className="flex items-end rounded-ink border border-ink-white/20 bg-ink-white/15 p-3 shadow-sm sm:p-4"
                    key={label}
                  >
                    <span
                      className={[
                        "block w-full overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[1.05rem] font-black leading-none sm:text-2xl",
                        index === 0 ? "text-ink-accent" : "text-ink-white",
                      ].join(" ")}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-5" aria-labelledby="home-categories">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              id="home-categories"
              level="h2"
              subtitle="Accede rapido a las familias publicas del catalogo InkToy."
              title="Categorias rapidas"
            />
            <Button className="w-full sm:w-auto" href="/categorias" variant="ghost">
              Ver todas las categorias
            </Button>
          </div>

          {categories.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
              {categories.items.map((category) => (
                <CategoryQuickLink category={category} key={category.slug} />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Todavia no hay categorias publicas disponibles. Puedes revisar los productos publicados del catalogo."
              primaryAction={{ href: "/productos", label: "Ver productos" }}
              title="Categorias en preparacion"
            />
          )}
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-5" aria-labelledby="home-products">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              id="home-products"
              level="h2"
              subtitle="Una primera vista de productos publicados para consulta en tienda."
              title="Productos del catalogo"
            />
            <Button className="w-full sm:w-auto" href="/productos" variant="ghost">
              Ver catalogo completo
            </Button>
          </div>

          {products.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {products.items.map((product) => (
                <ProductCard
                  availability={getAvailabilityVariant(product)}
                  brand={product.brand?.name}
                  detailHref={`/productos/${product.slug}`}
                  imageAlt={getSafeImageAlt(product.primaryImage?.altText, product.name)}
                  imageSrc={getSafeImageSrc(product.primaryImage?.url)}
                  key={product.slug}
                  name={product.name}
                  price={product.price.formatted}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Todavia no hay productos publicados en el catalogo publico. Explora las categorias disponibles mientras preparamos mas informacion."
              primaryAction={{ href: "/categorias", label: "Ver categorias" }}
              title="Productos en preparacion"
            />
          )}
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-5" aria-labelledby="home-trust">
          <SectionHeading
            id="home-trust"
            level="h2"
            subtitle="Una experiencia publica enfocada en explorar el catalogo antes de consultar en tienda."
            title="Confianza y servicio"
          />
          <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
            {benefits.map((benefit) => (
              <BenefitCard description={benefit.description} key={benefit.title} title={benefit.title} />
            ))}
          </div>
        </section>
      </main>
      <StorefrontFooter />
      <BottomNavigation activeItem="inicio" />
    </>
  );
}
