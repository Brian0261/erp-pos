import Link from "next/link";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export type BreadcrumbsProps = {
  className?: string;
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ className, items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Ruta de navegación" className={className}>
      <ol className="flex flex-wrap items-center gap-2 font-sans text-sm text-ink-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
              {item.href && !isLast ? (
                <Link className="font-semibold text-ink-primary hover:underline" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-ink-body">
                  {item.label}
                </span>
              )}
              {!isLast ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
