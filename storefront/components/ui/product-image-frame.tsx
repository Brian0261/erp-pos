import Image, { type ImageLoaderProps } from "next/image";
import { pickResponsiveImageVariant, type SafeResponsiveImageVariant } from "@/lib/images";

export type ProductImageFrameProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
  responsiveVariants?: SafeResponsiveImageVariant[];
  src?: string | null;
};

export function ProductImageFrame({
  alt = "Imagen de producto InkToy",
  className,
  priority = false,
  responsiveVariants,
  src,
}: ProductImageFrameProps) {
  const hasResponsiveVariants = Boolean(src && responsiveVariants?.length);
  const responsiveLoader = hasResponsiveVariants
    ? ({ src: fallbackSrc, width }: ImageLoaderProps) => {
        const variant = pickResponsiveImageVariant(responsiveVariants ?? [], width);
        return variant?.url ?? fallbackSrc;
      }
    : undefined;

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
          loader={responsiveLoader}
          priority={priority}
          sizes="(min-width: 1024px) 360px, (min-width: 768px) 45vw, 92vw"
          src={src}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,var(--ink-white),var(--ink-soft))] p-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-ink-accent/50 font-serif text-xl font-bold text-ink-primary shadow-[0_10px_24px_rgb(255_209_102_/_0.28)] sm:size-14 sm:text-2xl">
            IT
          </div>
          <p className="max-w-[8rem] font-sans text-[11px] font-semibold leading-tight text-ink-body sm:text-sm">
            Imagen InkToy proximamente
          </p>
        </div>
      )}
    </div>
  );
}
