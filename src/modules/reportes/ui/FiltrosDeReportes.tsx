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
  ESTADOS_DE_REPORTE,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  TIPOS_DE_INCIDENCIA,
} from "../domain";
import { hrefSinFiltro } from "./hrefsDeListado";

type Props = FiltrosDeListado & { q?: string | undefined };

/**
 * Un solo `<form method="get">` para busqueda y filtros, no dos separados
 * (`design.md`, "Buscador": "convive con los filtros de la misma pantalla,
 * nunca los reemplaza"). Con dos forms, cambiar el `<select>` de estado
 * mandaria un GET que no lleva `q`, y la busqueda escrita se perderia sin
 * que nada lo avise. Un solo submit manda los tres a la vez, sin
 * JavaScript ni campos ocultos.
 *
 * Los chips de abajo (`design.md`, "Filtros") son el select confirmado: el
 * `<select>` captura, el chip dice que el filtro esta puesto -sin el, un
 * `<select>` que cambia de valor se lee como la lista completa, no como un
 * resultado acotado.
 */
export function FiltrosDeReportes({ q, estado, tipo }: Props) {
  const filtros: FiltrosDeListado = {
    ...(estado ? { estado } : {}),
    ...(tipo ? { tipo } : {}),
  };

  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
            Buscar reporte
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
            ESTADOS_DE_REPORTE,
            ETIQUETA_DE_ESTADO_DE_REPORTE,
          )}
        />
        <CampoDeLista
          id="filtro-tipo"
          name="tipo"
          etiqueta="Tipo"
          marcador="Todos"
          opcional
          defaultValue={tipo ?? ""}
          opciones={opcionesEtiquetadas(
            TIPOS_DE_INCIDENCIA,
            ETIQUETA_DE_TIPO_DE_INCIDENCIA,
          )}
        />
        <Boton type="submit" variante="secundaria">
          Buscar
        </Boton>
      </form>

      {estado || tipo ? (
        <div className="flex flex-wrap gap-2">
          {estado ? (
            <ChipDeFiltro
              etiqueta={`Estado: ${ETIQUETA_DE_ESTADO_DE_REPORTE[estado]}`}
              hrefQuitar={hrefSinFiltro({ filtros, q }, "estado")}
            />
          ) : null}
          {tipo ? (
            <ChipDeFiltro
              etiqueta={`Tipo: ${ETIQUETA_DE_TIPO_DE_INCIDENCIA[tipo]}`}
              hrefQuitar={hrefSinFiltro({ filtros, q }, "tipo")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
