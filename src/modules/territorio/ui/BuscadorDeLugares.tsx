import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  Boton,
  ChipDeFiltro,
  CLASES_DE_ENLACE,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
} from "@/shared/ui";

type Props = {
  busqueda: string | undefined;
};

/**
 * El buscador de la entrada: un campo con icono, `?q=`, un GET resuelto en
 * el servidor y sin autocompletado vivo. El filtro aplicado vive siempre a
 * la vista como chip con su "x" para quitarlo.
 *
 * Lleva boton «Buscar»: en el celular nadie sabe que hay que pulsar Enter,
 * y una busqueda sin boton se ve igual que un texto escrito (I1 de
 * `odd/tasks/territorio-ux.md`, S1).
 *
 * Es el unico buscador de la entrada. Filtra lugares por nombre; la calle
 * y el numero los lee el registro de domicilios, y por eso la misma
 * busqueda se ofrece alla como enlace: un GET mas, sin JavaScript.
 */
export function BuscadorDeLugares({ busqueda }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form method="get" className="flex w-full flex-col gap-1 sm:w-auto">
        <label htmlFor="buscar-lugar" className={CLASES_DE_ETIQUETA}>
          Buscar lugar o domicilio
        </label>
        <div className="flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
            />
            <input
              id="buscar-lugar"
              name="q"
              type="search"
              enterKeyHint="search"
              maxLength={100}
              placeholder="Colonia, comisaría o calle y número"
              defaultValue={busqueda}
              className={`${clasesDeCampo()} pl-9`}
            />
          </div>
          <Boton type="submit" variante="secundaria">
            Buscar
          </Boton>
        </div>
      </form>
      {busqueda ? (
        <>
          <ChipDeFiltro
            etiqueta={`Búsqueda: ${busqueda}`}
            hrefQuitar="/territorio"
          />
          <Link
            href={`/territorio/domicilios?q=${encodeURIComponent(busqueda)}`}
            className={`inline-flex min-h-11 items-center gap-2 rounded-sm text-[15px] ${CLASES_DE_ENLACE}`}
          >
            Buscar «{busqueda}» en el registro de domicilios
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </>
      ) : null}
    </div>
  );
}
