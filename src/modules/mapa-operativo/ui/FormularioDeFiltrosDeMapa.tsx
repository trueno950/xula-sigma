import { Boton, CampoDeLista } from "@/shared/ui";
import type { FiltrosDeMapa } from "../application";
import {
  AREAS_PARA_FILTRO,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  etiquetaDeFiltro,
  type TerritorioDeMapa,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "../domain";
import { PliegueDeFiltros } from "./PliegueDeFiltros";

const opcionesDeCatalogo = (valores: readonly string[]) =>
  valores.map((valor) => ({ valor, etiqueta: etiquetaDeFiltro(valor) }));
const combinar = (...listas: readonly (readonly string[])[]) =>
  Array.from(new Set(listas.flat()));

const CAMPOS =
  "grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end";

type Props = FiltrosDeMapa & {
  territorios: readonly TerritorioDeMapa[];
  /** Los filtros puestos: es el N de «Filtros (N)» bajo 1024px. */
  activos: number;
};

/**
 * `<form method="get">` nativo, mismo criterio que `FiltrosDeReportes`: un
 * solo submit manda tipo/estado/area/lugar a la vez, sin JavaScript. `tipo` y
 * `estado` combinan el vocabulario de los dos recursos -el mapa decide a cual
 * aplica cada valor, no este formulario-. `lugar` va en el mismo formulario a
 * proposito: si viajara aparte, filtrar por tipo borraria el territorio
 * elegido de la URL.
 *
 * S2: los campos se pliegan detras de un `<details>` «Filtros (N)» que cuenta
 * los puestos. El pliegue -y su apertura en escritorio- viven en
 * `PliegueDeFiltros`, que es la hoja que necesita `matchMedia`; aca queda la
 * barra, que el servidor puede armar sin JavaScript.
 */
export function FormularioDeFiltrosDeMapa({
  tipo,
  estado,
  area,
  lugar,
  territorios,
  activos,
}: Props) {
  return (
    <PliegueDeFiltros activos={activos}>
      <form method="get" aria-label="Filtros del mapa" className={CAMPOS}>
        <CampoDeLista
          id="filtro-lugar"
          name="lugar"
          etiqueta="Territorio"
          marcador="Todo el municipio"
          opcional
          defaultValue={lugar ?? ""}
          opciones={territorios.map(({ id, nombre }) => ({
            valor: id,
            etiqueta: nombre,
          }))}
        />
        <CampoDeLista
          id="filtro-tipo"
          name="tipo"
          etiqueta="Tipo"
          marcador="Todos"
          opcional
          defaultValue={tipo ?? ""}
          opciones={opcionesDeCatalogo(
            combinar(
              TIPOS_DE_REPORTE_PARA_FILTRO,
              TIPOS_DE_INTERVENCION_PARA_FILTRO,
            ),
          )}
        />
        <CampoDeLista
          id="filtro-estado"
          name="estado"
          etiqueta="Estado"
          marcador="Todos"
          opcional
          defaultValue={estado ?? ""}
          opciones={opcionesDeCatalogo(
            combinar(
              ESTADOS_DE_REPORTE_PARA_FILTRO,
              ESTADOS_DE_INTERVENCION_PARA_FILTRO,
            ),
          )}
        />
        <CampoDeLista
          id="filtro-area"
          name="area"
          etiqueta="Área"
          marcador="Todas"
          opcional
          defaultValue={area ?? ""}
          opciones={opcionesDeCatalogo(AREAS_PARA_FILTRO)}
        />
        <Boton type="submit" variante="secundaria">
          Filtrar
        </Boton>
      </form>
    </PliegueDeFiltros>
  );
}
