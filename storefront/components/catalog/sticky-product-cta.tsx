import { Button } from "@/components/ui";

export type StickyProductCTAProps = {
  className?: string;
  href?: string;
  label?: string;
};

export function StickyProductCTA({
  className,
  href = "#",
  label = "Consultar en tienda",
}: StickyProductCTAProps) {
  return (
    <aside
      aria-label="Acción de consulta de producto"
      className={[
        "fixed inset-x-0 bottom-0 z-40 border-t border-ink-border bg-ink-white/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4 backdrop-blur-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto max-w-3xl">
        <Button className="min-h-12 w-full text-base" href={href} size="lg">
          {label}
        </Button>
      </div>
    </aside>
  );
}
