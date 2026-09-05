import { X } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ANILLO_DE_FOCO } from "./estilos";

type Props = {
  /** Lo que el filtro dice, p. ej. "Estado: Recibido". */
  etiqueta: string;
  /** La misma pantalla sin este filtro puesto. */
  hrefQuitar: string;
};

/**
 * El chip de filtro activo de `DESIGN.md`, seccion "Filtros": fondo
 * caliza-relleno, texto tinta, 4px de radio, alto 32px, la "x" de quitar
 * dentro del chip. Va en `shared/ui` y no en un modulo porque es el mismo
 * componente para cualquier lista con filtros de lista cerrada -reportes lo
 * usa primero, pero el token `filtro-activo` de `DESIGN.md` ya lo declara
 * compartido.
 *
 * Es un `<Link>`, no un boton con `onClick`: quitar un filtro es
 * navegacion -mismo criterio que "Ver mas" y el encabezado ordenable de
 * `Tabla`-, nunca estado de cliente.
 */
export function ChipDeFiltro({ etiqueta, hrefQuitar }: Props) {
  return (
    <Link
      href={hrefQuitar}
      className={`inline-flex h-8 items-center gap-1.5 rounded-sm bg-caliza-relleno px-2.5 text-[13px] font-medium text-caliza-tinta hover:bg-caliza-borde ${ANILLO_DE_FOCO}`}
    >
      {etiqueta}
      <X size={12} weight="bold" aria-hidden="true" />
      <span className="sr-only">Quitar filtro: {etiqueta}</span>
    </Link>
  );
}
