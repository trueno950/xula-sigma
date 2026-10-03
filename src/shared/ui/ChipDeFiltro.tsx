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
 * El chip de filtro aplicado de `DESIGN.md`: pastilla de 32px sobre marca
 * suave, texto de tinta y la "x" de quitar dentro. Es uno de los seis lugares
 * donde vive la marca, y solo como fondo.
 *
 * Es un `<Link>`, no un boton con `onClick`: quitar un filtro es
 * navegacion -mismo criterio que "Ver mas" y el encabezado ordenable de
 * `Tabla`-, nunca estado de cliente.
 */
export function ChipDeFiltro({ etiqueta, hrefQuitar }: Props) {
  return (
    <Link
      href={hrefQuitar}
      className={`inline-flex h-8 items-center gap-1.5 rounded-pill bg-marca-suave px-3 text-[13px] font-medium text-caliza-tinta transition-colors duration-150 ease-salida hover:bg-caliza-relleno ${ANILLO_DE_FOCO}`}
    >
      {etiqueta}
      <X size={12} weight="bold" aria-hidden="true" />
      <span className="sr-only">Quitar filtro: {etiqueta}</span>
    </Link>
  );
}
