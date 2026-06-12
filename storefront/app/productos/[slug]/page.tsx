import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StickyProductCTA } from "@/components/catalog";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { Accordion, Badge, Breadcrumbs, ProductImageFrame, SectionHeading } from "@/components/ui";
import { getStorefrontProductBySlug, StorefrontApiError } from "@/lib/api";
import { getSafeImageAlt, getSafeImageSrc, getSafeOpenGraphImage } from "@/lib/images";
import { canStorefrontAllowIndexing } from "@/lib/seo";
import type { PublicProductDetailResponse } from "@/types/storefront";

export const revalidate = 300;

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function isIndexableProduct(product: PublicProductDetailResponse) {
  return canStorefrontAllowIndexing() && product.indexable && (product.seo?.indexable ?? true);
}

function getCanonicalUrl(product: PublicProductDetailResponse) {
  return product.seo?.canonicalUrl ?? product.canonicalUrl ?? undefined;
}

function getAvailabilityVariant(product: PublicProductDetailResponse) {
  const status = product.availability.status.toLowerCase();

  if (!product.availability.purchasable || status.includes("out") || status.includes("agot")) {
    return "soldOut" as const;
  }

  if (status.includes("store") || status.includes("tienda")) {
    return "store" as const;
  }

  return "available" as const;
}

async function loadProduct(slug: string) {
  try {
    return await getStorefrontProductBySlug(slug);
  } catch (error) {
    if (error instanceof StorefrontApiError && error.isNotFound) {
      notFound();
    }

    throw error;
  }
}

async function loadProductForMetadata(slug: string) {
  try {
    return await getStorefrontProductBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProductForMetadata(slug);

  if (!product) {
    return {
      title: "Producto no disponible | InkToy",
      description: "El producto solicitado no esta disponible en InkToy.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = product.seo?.title ?? product.name;
  const description = product.seo?.description ?? product.description ?? "Producto disponible en InkToy.";
  const canonical = getCanonicalUrl(product);
  const ogImage = getSafeOpenGraphImage(product.seo?.ogImageUrl) ?? getSafeOpenGraphImage(product.primaryImage?.url);
  const indexable = isIndexableProduct(product);

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: product.seo?.ogTitle ?? title,
      description: product.seo?.ogDescription ?? description,
      images: ogImage ? [ogImage] : undefined,
      type: "website",
    },
    robots: {
      index: indexable,
      follow: indexable,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const categoryName = product.category?.name;
  const brandName = product.brand?.name;
  const imageAlt = getSafeImageAlt(product.primaryImage?.altText, product.name);
  const imageSrc = getSafeImageSrc(product.primaryImage?.url);
  const description = product.description ?? "Producto disponible para consulta en tiendas InkToy.";
  const availabilityVariant = getAvailabilityVariant(product);
  const galleryCount = product.gallery.length;

  return (
    <>
      <StorefrontHeader />
      <main className="flex flex-1 flex-col bg-ink-cream px-4 pb-56 pt-6 sm:px-6 md:pb-36 lg:px-8">
        <article className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <section className="space-y-4" aria-label="Imagen de producto">
            <Breadcrumbs
              items={[
                { href: "/", label: "Inicio" },
                { label: "Productos" },
                ...(categoryName ? [{ label: categoryName }] : []),
                { label: product.name },
              ]}
            />
            <ProductImageFrame
              alt={imageAlt}
              className="aspect-[16/11] bg-ink-white shadow-ink-soft lg:sticky lg:top-24"
              priority
              src={imageSrc}
            />
            {galleryCount > 1 ? (
              <p className="font-sans text-sm text-ink-muted">
                {galleryCount} imagenes disponibles. Galeria avanzada diferida.
              </p>
            ) : null}
          </section>

          <section className="space-y-6 rounded-ink border border-ink-border bg-ink-white p-5 shadow-ink-soft sm:p-7">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {categoryName ? <Badge variant="neutral">{categoryName}</Badge> : null}
                {brandName ? <Badge variant="accent">{brandName}</Badge> : null}
              </div>
              <SectionHeading level="h1" title={product.name} />
              <div className="space-y-3">
                <p className="font-sans text-4xl font-extrabold tracking-tight text-ink-primary">
                  {product.price.formatted}
                </p>
                <Badge variant={availabilityVariant}>{product.availability.label}</Badge>
              </div>
              <p className="font-sans text-lg leading-7 text-ink-body">{description}</p>
            </div>

            <div className="rounded-ink border border-ink-border px-4">
              <Accordion
                items={[
                  {
                    content: description,
                    defaultOpen: true,
                    id: "specifications",
                    title: "Especificaciones",
                  },
                  {
                    content: `Estado: ${product.availability.label}. Consulta disponibilidad final en tienda antes de acercarte.`,
                    id: "availability",
                    title: "Disponibilidad",
                  },
                ]}
              />
            </div>
          </section>
        </article>
      </main>
      <StorefrontFooter />
      <StickyProductCTA className="bottom-[57px] md:bottom-0" />
      <BottomNavigation />
    </>
  );
}
