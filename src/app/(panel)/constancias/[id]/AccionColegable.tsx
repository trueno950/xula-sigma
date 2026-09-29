import { CaretRight } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { ANILLO_DE_FOCO } from "@/shared/ui";

/**
 * Reimprimir y cancelar son acciones raras y, la segunda, irreversible: no
 * se muestran abiertas por defecto junto a los datos del documento.
 * `<details>` es nativo -sin `"use client"`, mismo criterio que
 * `AccionesDeReporte`- asi que colapsar no cuesta JavaScript.
 */
export const AccionColegable = ({
  titulo,
  Icono,
  children,
}: {
  titulo: string;
  Icono: typeof CaretRight;
  children: ReactNode;
}) => (
  <details className="group rounded-md border border-caliza-divisor bg-caliza-superficie">
    <summary
      className={`flex h-11 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 text-[15px] font-medium text-caliza-tinta hover:bg-caliza-relleno [&::-webkit-details-marker]:hidden ${ANILLO_DE_FOCO}`}
    >
      <span className="flex items-center gap-2">
        <Icono size={18} aria-hidden="true" />
        {titulo}
      </span>
      <CaretRight
        size={16}
        aria-hidden="true"
        className="shrink-0 group-open:rotate-90"
      />
    </summary>
    <div className="flex flex-col gap-4 border-t border-caliza-divisor p-4">
      {children}
    </div>
  </details>
);
