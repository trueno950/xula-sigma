import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Boton,
  CampoDeLista,
  ChipDeFiltro,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  opcionesEtiquetadas,
} from "@/shared/ui";
import type { FiltrosDeListado } from "../application/puertos";
import {
  ESTADOS_DE_CONSTANCIA,
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
} from "../domain";
import { hrefSinEstado } from "./hrefsDeListado";

type Props = FiltrosDeListado & { q?: string | undefined };

/**
 * Un solo `<form method="get">` para busqueda y filtro, no dos separados
 * -mismo motivo que `reportes/ui/FiltrosDeReportes.tsx` (`design.md`,
 * "Buscador").
 *
 * Sin `<select>` de tipo de documento -motivo en `FiltrosDeListado`,
 * `application/puertosDeListado.ts`.
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
          opciones={opcionesEtiquetadas(
            ESTADOS_DE_CONSTANCIA,
            ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
          )}
        />
        <Boton type="submit" variante="secundaria">
          Buscar
        </Boton>
      </form>

      {estado ? (
        <div className="flex flex-wrap gap-2">
          <ChipDeFiltro
            etiqueta={`Estado: ${ETIQUETA_DE_ESTADO_DE_CONSTANCIA[estado]}`}
            hrefQuitar={hrefSinEstado({ q })}
          />
        </div>
      ) : null}
    </div>
  );
}
