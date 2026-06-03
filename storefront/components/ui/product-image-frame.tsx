import Image from "next/image";

export type ProductImageFrameProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
  src?: string | null;
};

export function ProductImageFrame({
  alt = "Imagen de producto InkToy",
  className,
  priority = false,
  src,
}: ProductImageFrameProps) {
  return (
    <div
      className={[
        "relative aspect-[4/5] overflow-hidden rounded-ink border border-ink-border bg-ink-soft shadow-ink-soft",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {src ? (
        <Image
          alt={alt}
          className="object-cover"
          fill
          priority={priority}
          sizes="(min-width: 1024px) 360px, (min-width: 768px) 45vw, 92vw"
          src={src}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-ink-accent/40 text-2xl font-bold text-ink-primary">
            IT
          </div>
          <p className="font-sans text-sm font-semibold text-ink-body">Imagen no disponible</p>
        </div>
      )}
    </div>
  );
}
