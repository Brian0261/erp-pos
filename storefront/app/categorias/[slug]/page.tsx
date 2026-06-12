import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState, ProductCard } from "@/components/catalog";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { Breadcrumbs, SectionHeading } from "@/components/ui";
import { getStorefrontCategoryBySlug, getStorefrontProducts, StorefrontApiError } from "@/lib/api";
import { getSafeImageAlt, getSafeImageSrc, getSafeOpenGraphImage } from "@/lib/images";
import { canStorefrontAllowIndexing } from "@/lib/seo";
import type { PublicCategoryDetailResponse, PublicProductListItemResponse } from "@/types/storefront";

export const revalidate = 300;

type CategoryDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function isIndexableCategory(category: PublicCategoryDetailResponse) {
  return canStorefrontAllowIndexing() && category.indexable && (category.seo?.indexable ?? true);
}

function getCanonicalUrl(category: PublicCategoryDetailResponse) {
  return category.seo?.canonicalUrl ?? category.canonicalUrl ?? undefined;
}

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

async function loadCategory(slug: string) {
  try {
    return await getStorefrontCategoryBySlug(slug);
  } catch (error) {
    if (error instanceof StorefrontApiError && error.isNotFound) {
      notFound();
    }

    throw error;
  }
}

async function loadCategoryForMetadata(slug: string) {
  try {
    return await getStorefrontCategoryBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategoryForMetadata(slug);

  if (!category) {
    return {
      title: "Categoria no disponible | InkToy",
      description: "La categoria solicitada no esta disponible en InkToy.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = category.seo?.title ?? `${category.name} | InkToy`;
  const description = category.seo?.description ?? category.description ?? "Categoria publica del catalogo InkToy.";
  const canonical = getCanonicalUrl(category);
  const ogImage = getSafeOpenGraphImage(category.seo?.ogImageUrl);
  const indexable = isIndexableCategory(category);

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: category.seo?.ogTitle ?? title,
      description: category.seo?.ogDescription ?? description,
      images: ogImage ? [ogImage] : undefined,
      type: "website",
    },
    robots: {
      index: indexable,
      follow: indexable,
    },
  };
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params;
  const category = await loadCategory(slug);
  const products = await getStorefrontProducts({ categorySlug: slug, page: 0, size: 24 });
  const subtitle = category.description ?? `Explora ${category.productCount} productos publicados en esta categoria.`;

  return (
    <>
      <StorefrontHeader />
      <main className="flex flex-1 flex-col gap-8 bg-ink-cream px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-7xl space-y-5">
          <Breadcrumbs
            items={[
              { href: "/", label: "Inicio" },
              { href: "/categorias", label: "Categorias" },
              { label: category.name },
            ]}
          />
          <div className="rounded-ink border border-ink-border bg-ink-white p-5 shadow-ink-soft sm:p-7">
            <SectionHeading
              eyebrow="Categoria publica"
              level="h1"
              subtitle={subtitle}
              title={category.name}
            />
            <p className="mt-4 font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {category.productCount} productos publicados
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl" aria-label={`Productos de ${category.name}`}>
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
              description="Esta categoria existe, pero todavia no tiene productos publicados para mostrar en el catalogo publico."
              primaryAction={{ href: "/categorias", label: "Ver categorias" }}
              secondaryAction={{ href: "/productos", label: "Ver productos" }}
              title="Sin productos publicados"
            />
          )}
        </section>
      </main>
      <StorefrontFooter />
      <BottomNavigation activeItem="categorias" />
    </>
  );
}
