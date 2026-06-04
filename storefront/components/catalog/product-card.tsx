import { Badge, Button, ProductImageFrame } from "@/components/ui";

export type ProductAvailability = "available" | "soldOut" | "store";

export type ProductCardProps = {
  availability?: ProductAvailability;
  brand?: string;
  detailHref?: string;
  imageAlt?: string;
  imageSrc?: string | null;
  name: string;
  price: string;
};

const availabilityLabel: Record<ProductAvailability, string> = {
  available: "Disponible",
  soldOut: "Agotado",
  store: "Disponible en tienda",
};

const availabilityVariant: Record<ProductAvailability, "available" | "soldOut" | "store"> = {
  available: "available",
  soldOut: "soldOut",
  store: "store",
};

export function ProductCard({
  availability = "available",
  brand,
  detailHref = "#",
  imageAlt,
  imageSrc,
  name,
  price,
}: ProductCardProps) {
  return (
    <article className="flex h-full flex-col rounded-ink border border-ink-border bg-ink-white p-3 shadow-ink-soft">
      <ProductImageFrame
        alt={imageAlt ?? name}
        className="aspect-square shadow-none"
        src={imageSrc}
      />
      <div className="flex flex-1 flex-col gap-3 pt-4">
        <div className="min-w-0 space-y-1">
          {brand ? <p className="truncate font-sans text-sm text-ink-muted">{brand}</p> : null}
          <h3 className="line-clamp-2 font-sans text-base font-semibold leading-snug text-ink-primary">
            {name}
          </h3>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <p className="font-sans text-xl font-extrabold text-ink-primary">{price}</p>
          <Badge variant={availabilityVariant[availability]}>{availabilityLabel[availability]}</Badge>
        </div>
        <Button className="w-full" href={detailHref} variant="secondary">
          Ver detalle
        </Button>
      </div>
    </article>
  );
}
