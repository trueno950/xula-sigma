import type { ReactNode } from "react";

/**
 * Campos relacionados bajo un Headline (`DESIGN.md`, Formularios): la
 * agrupacion se resuelve con tipografia y espacio, no con cajas anidadas.
 */
export function GrupoDeCampos({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="mb-4 p-0 text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}
