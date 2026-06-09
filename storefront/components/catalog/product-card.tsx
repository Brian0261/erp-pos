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
    <article className="flex h-full flex-col rounded-ink border border-ink-border bg-ink-white p-2.5 shadow-ink-soft sm:p-3">
      <ProductImageFrame
        alt={imageAlt ?? name}
        className="aspect-square shadow-none"
        src={imageSrc}
      />
      <div className="flex flex-1 flex-col gap-2.5 pt-3">
        <div className="min-w-0 space-y-1">
          {brand ? <p className="truncate font-sans text-xs text-ink-muted sm:text-sm">{brand}</p> : null}
          <h3 className="line-clamp-2 min-h-[2.5rem] font-sans text-sm font-semibold leading-tight text-ink-primary sm:text-base sm:leading-snug">
            {name}
          </h3>
        </div>
        <div className="mt-auto flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="font-sans text-lg font-extrabold text-ink-primary sm:text-xl">{price}</p>
          <Badge variant={availabilityVariant[availability]}>{availabilityLabel[availability]}</Badge>
        </div>
        <Button className="w-full text-xs sm:text-sm" href={detailHref} size="sm" variant="secondary">
          Ver detalle
        </Button>
      </div>
    </article>
  );
}
