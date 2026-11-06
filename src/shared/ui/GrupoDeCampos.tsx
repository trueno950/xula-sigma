import type { ReactNode } from "react";

const LEYENDA = {
  seccion: "text-[1.25rem] leading-[1.3] tracking-[-0.01em]",
  subseccion: "text-[15px] leading-[1.4]",
} as const;

/**
 * Campos relacionados bajo un titulo (`DESIGN.md`, Formularios): la
 * agrupacion se resuelve con tipografia y espacio, no con cajas anidadas.
 * En una pagina la leyenda es Headline; dentro de un `Panel`, que ya titula
 * en Headline, baja a Title (`nivel="subseccion"`).
 */
export function GrupoDeCampos({
  titulo,
  nivel = "seccion",
  children,
}: {
  titulo: string;
  nivel?: keyof typeof LEYENDA;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend
        className={`mb-4 p-0 font-semibold text-caliza-tinta ${LEYENDA[nivel]}`}
      >
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}
