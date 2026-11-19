import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Boton,
  ChipDeFiltro,
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
 * Lleva boton «Buscar» como el de domicilio de `EnlacesDeLaEntrada`: en el
 * celular nadie sabe que hay que pulsar Enter, y una busqueda sin boton se
 * ve igual que un texto escrito (I1 de `odd/tasks/territorio-ux.md`, S1).
 */
export function BuscadorDeLugares({ busqueda }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form method="get" className="flex w-full flex-col gap-1 sm:w-auto">
        <label htmlFor="buscar-lugar" className={CLASES_DE_ETIQUETA}>
          Buscar lugar por nombre
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
              placeholder="Colonia o comisaría"
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
        <ChipDeFiltro
          etiqueta={`Búsqueda: ${busqueda}`}
          hrefQuitar="/territorio"
        />
      ) : null}
    </div>
  );
}
