import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { ChipDeFiltro, clasesDeCampo } from "@/shared/ui";

type Props = {
  busqueda: string | undefined;
};

/**
 * El buscador de `DESIGN.md`: un campo con icono, `?q=`, espera Enter. Es un
 * GET resuelto en el servidor; sin autocompletado vivo. El filtro aplicado
 * vive siempre a la vista como chip con su "x" para quitarlo.
 */
export function BuscadorDeLugares({ busqueda }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form method="get" className="w-full sm:w-80">
        <label htmlFor="buscar-lugar" className="sr-only">
          Buscar lugar por nombre
        </label>
        <div className="relative">
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
            placeholder="Buscar lugar"
            defaultValue={busqueda}
            className={`${clasesDeCampo()} pl-9`}
          />
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
