import type { HTMLAttributes } from "react";

export type StorefrontFooterProps = HTMLAttributes<HTMLElement>;

const sections = [
  {
    title: "InkToy",
    links: [
      { label: "Sobre nosotros" },
      { label: "Contacto" },
      { label: "Trabaja con nosotros" },
    ],
  },
  {
    title: "Categorías",
    links: [
      { label: "Útiles escolares" },
      { label: "Papelería" },
      { label: "Pasamanería" },
      { label: "Manualidades" },
    ],
  },
  {
    title: "Información",
    links: [
      { label: "Preguntas frecuentes" },
      { label: "Términos y condiciones" },
      { label: "Política de privacidad" },
    ],
  },
  {
    title: "Tiendas",
    links: [
      { label: "Locales" },
      { label: "Horarios" },
      { label: "Mapa de tiendas" },
    ],
  },
];

export function StorefrontFooter({ className, ...props }: StorefrontFooterProps) {
  return (
    <footer
      className={["border-t border-ink-border bg-ink-soft", className].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Links grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 font-serif text-base font-bold text-ink-primary">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <span className="inline-block font-sans text-sm text-ink-body transition-colors hover:text-ink-primary">
                      {link.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-ink-border pt-6 sm:flex-row">
          <p className="font-sans text-sm text-ink-muted">
            © {new Date().getFullYear()} InkToy. Todos los derechos reservados.
          </p>
          <p className="font-sans text-xs text-ink-muted">
            Diseñado para la experiencia de compra en Perú
          </p>
        </div>
      </div>
    </footer>
  );
}
