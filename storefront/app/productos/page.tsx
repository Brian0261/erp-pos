import type { Metadata } from "next";
import { ProductCard, EmptyState } from "@/components/catalog";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { Breadcrumbs, SectionHeading } from "@/components/ui";
import { getStorefrontProducts } from "@/lib/api";
import type { PublicProductListItemResponse } from "@/types/storefront";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Productos | InkToy",
  description: "Explora el catalogo publico de productos disponibles para consulta en InkToy.",
};

function getSafeImageSrc(src?: string | null) {
  if (!src) {
    return null;
  }

  return src.startsWith("/") ? src : null;
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

export default async function ProductsPage() {
  const products = await getStorefrontProducts({ page: 0, size: 24 });

  return (
    <>
      <StorefrontHeader />
      <main className="flex flex-1 flex-col gap-8 bg-ink-cream px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-7xl space-y-5">
          <Breadcrumbs
            items={[
              { href: "/", label: "Inicio" },
              { label: "Productos" },
            ]}
          />
          <SectionHeading
            eyebrow="Catalogo publico"
            level="h1"
            subtitle="Descubre nuestra seleccion de productos para tu escuela, oficina o proyectos creativos."
            title="Productos InkToy"
          />
        </section>

        <section className="mx-auto w-full max-w-7xl" aria-label="Listado de productos">
          {products.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {products.items.map((product) => (
                <ProductCard
                  availability={getAvailabilityVariant(product)}
                  brand={product.brand?.name}
                  detailHref={`/productos/${product.slug}`}
                  imageAlt={product.primaryImage?.altText ?? product.name}
                  imageSrc={getSafeImageSrc(product.primaryImage?.url)}
                  key={product.slug}
                  name={product.name}
                  price={product.price.formatted}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Todavia no hay productos publicados en el catalogo publico. Vuelve pronto para revisar novedades."
              primaryAction={{ href: "/categorias", label: "Ver categorias" }}
              title="No hay productos publicados"
            />
          )}
        </section>
      </main>
      <StorefrontFooter />
      <BottomNavigation />
    </>
  );
}
