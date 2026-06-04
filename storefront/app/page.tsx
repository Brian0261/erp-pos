import { CategoryCard, EmptyState, ProductCard } from "@/components/catalog";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { Accordion, Breadcrumbs, Chip, SectionHeading } from "@/components/ui";

const previewProducts = [
  {
    availability: "available" as const,
    brand: "InkToy",
    name: "Cuaderno Universitario A4 de tapa dura",
    price: "S/ 16.50",
  },
  {
    availability: "soldOut" as const,
    brand: "InkToy",
    name: "Mochila escolar clásica con bolsillo frontal",
    price: "S/ 89.00",
  },
];

export default function Home() {
  return (
    <>
      <StorefrontHeader />
      <main className="flex flex-1 flex-col gap-12 bg-ink-cream px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-7xl space-y-8">
          <Breadcrumbs
            items={[
              { href: "#", label: "Inicio" },
              { label: "Preview 2F.2C" },
            ]}
          />
          <SectionHeading
            eyebrow="Storefront preview"
            level="h1"
            subtitle="Vista técnica con datos mock para validar componentes visuales de catálogo. No consume API ni representa una página final."
            title="Catálogo Creativo Profesional"
          />
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-4" aria-labelledby="products-preview">
          <SectionHeading id="products-preview" level="h2" title="Productos destacados" />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              "Cuadernos",
              "Lápices",
              "Manualidades",
              "Pasamanería",
            ].map((label, index) => (
              <Chip key={label} selected={index === 0}>{label}</Chip>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {previewProducts.map((product) => (
              <ProductCard detailHref="#" key={product.name} {...product} />
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-2" aria-label="Categorías preview">
          <CategoryCard
            description="Material escolar básico para clases, tareas y organización diaria."
            name="Escolar"
          />
          <CategoryCard
            description="Papeles, cintas, hilos y detalles para proyectos creativos."
            name="Manualidades"
          />
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
          <EmptyState
            description="Prueba otra subcategoría o vuelve al catálogo principal."
            primaryAction={{ href: "#", label: "Ver categorías" }}
            secondaryAction={{ href: "#", label: "Limpiar filtros" }}
            title="No encontramos productos"
          />
          <div className="rounded-ink border border-ink-border bg-ink-white px-5 shadow-ink-soft">
            <Accordion
              items={[
                {
                  content: "Componentes visuales con props tipadas, sin consumo de API real.",
                  defaultOpen: true,
                  title: "Especificaciones",
                },
                {
                  content: "Tailwind CSS v4, tokens InkToy y estados accesibles para navegación por teclado.",
                  title: "Materiales",
                },
              ]}
            />
          </div>
        </section>
      </main>
      <StorefrontFooter />
      <BottomNavigation activeItem="inicio" />
    </>
  );
}
