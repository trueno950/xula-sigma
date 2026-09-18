import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Boton,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  type OpcionDeLista,
} from "@/shared/ui";
import type { FiltrosDeRegistro } from "../application/puertosDeDomicilios";

type Props = {
  filtros: FiltrosDeRegistro;
  /** Las raices del municipio: alimentan solo este `<select>`. */
  raices: readonly OpcionDeLista[];
};

/**
 * Un solo `<form method="get">` para los tres filtros, mismo criterio que
 * `FiltrosDeReportes`: con formularios separados, cambiar el `<select>` de
 * asentamiento mandaria un GET que no lleva la calle escrita, y la busqueda
 * se perderia sin que nada lo avise. Un solo submit manda los tres a la
 * vez, sin JavaScript ni campos ocultos.
 */
export function FiltrosDeDomicilios({ filtros, raices }: Props) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
          Buscar calle
        </label>
        <div className="relative">
          <MagnifyingGlass
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filtros.calle}
            className={`${clasesDeCampo()} w-64 pl-9`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="numero" className={CLASES_DE_ETIQUETA}>
          Numero
        </label>
        <input
          id="numero"
          name="numero"
          type="search"
          defaultValue={filtros.numero}
          className={`${clasesDeCampo()} w-32`}
        />
      </div>
      <CampoDeLista
        id="filtro-raiz"
        name="raiz"
        etiqueta="Asentamiento"
        marcador="Todos"
        opcional
        defaultValue={filtros.raizId ?? ""}
        opciones={raices}
      />
      <Boton type="submit" variante="secundaria">
        Buscar
      </Boton>
    </form>
  );
}
