import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Boton,
  CampoDeLista,
  ChipDeFiltro,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
} from "@/shared/ui";
import type { FiltrosDeListado } from "../application/puertos";
import { ESTADOS_DE_CONSTANCIA } from "../domain";
import { ESTADOS_LEGIBLES } from "./estadosLegibles";
import { hrefSinEstado } from "./hrefsDeListado";
import { opcionesDeCatalogo } from "./opciones";

type Props = FiltrosDeListado & { q?: string | undefined };

/**
 * Un solo `<form method="get">` para busqueda y filtro, no dos separados
 * (`design.md`, "Buscador": "convive con los filtros de la misma pantalla,
 * nunca los reemplaza"). Mismo motivo que
 * `reportes/ui/FiltrosDeReportes.tsx`: con dos forms, cambiar el `<select>`
 * de estado mandaria un GET que no lleva `q`, y la busqueda escrita se
 * perderia sin que nada lo avise.
 *
 * Sin `<select>` de tipo de documento: `TIPOS_DE_DOCUMENTO` tiene un solo
 * valor hoy (`VECINDAD`, `domain/tipoDeDocumento.ts`), y un filtro sobre una
 * lista cerrada de una sola opcion util no acota nada -se agrega el dia que
 * exista un segundo tipo de documento.
 */
export function FiltrosDeConstancias({ q, estado }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
            Buscar constancia
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
              defaultValue={q}
              className={`${clasesDeCampo()} w-64 pl-9`}
            />
          </div>
        </div>
        <CampoDeLista
          id="filtro-estado"
          name="estado"
          etiqueta="Estado"
          marcador="Todos"
          opcional
          defaultValue={estado ?? ""}
          opciones={opcionesDeCatalogo(ESTADOS_DE_CONSTANCIA)}
        />
        <Boton type="submit" variante="secundaria">
          Buscar
        </Boton>
      </form>

      {estado ? (
        <div className="flex flex-wrap gap-2">
          <ChipDeFiltro
            etiqueta={`Estado: ${ESTADOS_LEGIBLES[estado]}`}
            hrefQuitar={hrefSinEstado({ q })}
          />
        </div>
      ) : null}
    </div>
  );
}
