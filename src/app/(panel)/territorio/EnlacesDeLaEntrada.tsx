import { ListMagnifyingGlass, MapTrifold } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CLASES_DE_ENLACE } from "@/shared/ui";

const ENLACE = `inline-flex min-h-11 items-center gap-2 rounded-sm text-[15px] ${CLASES_DE_ENLACE}`;

/**
 * Las otras dos vistas de Territorio, como enlaces bajo el titulo y no
 * como botones de la cabecera: son lugares a donde ir, no acciones, y
 * cuatro botones se apilaban en cuatro anchos en el celular. Ver el
 * registro es lectura y llega a cualquier rol.
 */
export function EnlacesDeLaEntrada() {
  return (
    <nav
      aria-label="Más de Territorio"
      className="-mt-3 flex flex-wrap items-center gap-x-6"
    >
      <Link href="/territorio/domicilios" className={ENLACE}>
        <ListMagnifyingGlass size={18} aria-hidden="true" />
        Ver registro de domicilios
      </Link>
      <Link href="/territorio/zonas" className={ENLACE}>
        <MapTrifold size={18} aria-hidden="true" />
        Zonas operativas
      </Link>
    </nav>
  );
}
