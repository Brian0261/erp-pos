"use client";

import Image, { type ImageLoaderProps } from "next/image";
import type { SafeResponsiveImageVariant } from "@/lib/images";

export type ProductImageFrameClientProps = {
  alt: string;
  priority: boolean;
  responsiveVariants?: SafeResponsiveImageVariant[];
  sizes: string;
  src: string;
};

export function ProductImageFrameClient({
  alt,
  priority,
  responsiveVariants,
  sizes,
  src,
}: ProductImageFrameClientProps) {
  const hasResponsiveVariants = Boolean(responsiveVariants?.length);
  const responsiveLoader = hasResponsiveVariants
    ? ({ src: fallbackSrc, width }: ImageLoaderProps) => {
        const variant = pickResponsiveImageVariant(responsiveVariants ?? [], width);
        return variant?.url ?? fallbackSrc;
      }
    : undefined;

  return (
    <Image
      alt={alt}
      className="object-cover"
      fill
      loader={responsiveLoader}
      priority={priority}
      sizes={sizes}
      src={src}
    />
  );
}

function pickResponsiveImageVariant(
  variants: SafeResponsiveImageVariant[],
  requestedWidth?: number,
) {
  const validVariants = variants
    .filter((variant) => variant.url && variant.width > 0 && variant.height > 0)
    .sort((left, right) => left.width - right.width);

  if (!validVariants.length) {
    return null;
  }

  const width = typeof requestedWidth === "number" && requestedWidth > 0
    ? requestedWidth
    : validVariants[0].width;

  return validVariants.find((variant) => variant.width >= width) ?? validVariants[validVariants.length - 1] ?? null;
}
