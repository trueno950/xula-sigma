import {
  ListMagnifyingGlass,
  MagnifyingGlass,
  MapTrifold,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  Boton,
  CLASES_DE_ENLACE,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
} from "@/shared/ui";

const ENLACE = `inline-flex min-h-11 items-center gap-2 rounded-sm text-[15px] ${CLASES_DE_ENLACE}`;

/**
 * Las otras dos vistas de Territorio, como enlaces bajo el titulo y no
 * como botones de la cabecera: son lugares a donde ir, no acciones, y
 * cuatro botones se apilaban en cuatro anchos en el celular. Ver el
 * registro es lectura y llega a cualquier rol.
 *
 * La busqueda de domicilio va al lado porque el buscador de la entrada
 * solo encuentra lugares por nombre: es un GET nativo al registro, que
 * lee el `?q=` por calle y numero.
 */
export function EnlacesDeLaEntrada() {
  return (
    <>
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
      <search>
        <form
          method="get"
          action="/territorio/domicilios"
          className="flex flex-col gap-1"
        >
          <label htmlFor="buscar-domicilio" className={CLASES_DE_ETIQUETA}>
            Buscar domicilio
          </label>
          <div className="flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
            <div className="relative w-full sm:w-80">
              <MagnifyingGlass
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
              />
              <input
                id="buscar-domicilio"
                name="q"
                type="search"
                enterKeyHint="search"
                maxLength={100}
                placeholder="Calle y número"
                className={`${clasesDeCampo()} pl-9`}
              />
            </div>
            <Boton type="submit" variante="secundaria">
              Buscar
            </Boton>
          </div>
        </form>
      </search>
    </>
  );
}
