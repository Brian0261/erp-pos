import Image from "next/image";
import { Button } from "@/components/ui";

export type CategoryCardProps = {
  description?: string;
  href?: string;
  imageAlt?: string;
  imageSrc?: string | null;
  name: string;
};

export function CategoryCard({
  description,
  href = "#",
  imageAlt,
  imageSrc,
  name,
}: CategoryCardProps) {
  return (
    <article className="grid overflow-hidden rounded-ink border border-ink-border bg-ink-white shadow-ink-soft sm:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
      <div className="relative min-h-36 bg-ink-soft">
        {imageSrc ? (
          <Image
            alt={imageAlt ?? name}
            className="object-cover"
            fill
            sizes="(min-width: 768px) 44vw, 92vw"
            src={imageSrc}
          />
        ) : (
          <div className="flex h-full min-h-36 items-center justify-center bg-[linear-gradient(135deg,var(--ink-accent),var(--ink-cream))] p-6">
            <span className="font-serif text-4xl font-bold text-ink-primary">{name.slice(0, 1)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-3 p-5">
        <h3 className="font-serif text-2xl font-bold leading-tight text-ink-primary">{name}</h3>
        {description ? <p className="font-sans text-sm leading-6 text-ink-body">{description}</p> : null}
        <Button className="w-full sm:w-fit" href={href} variant="ghost">
          Ver categoría
          <span aria-hidden="true">→</span>
        </Button>
      </div>
    </article>
  );
}
