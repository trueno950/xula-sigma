import { Boton, CampoDeLista, CLASES_DE_TARJETA } from "@/shared/ui";
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

const opcionesDeCatalogo = (valores: readonly string[]) =>
  valores.map((valor) => ({ valor, etiqueta: etiquetaDeFiltro(valor) }));
const combinar = (...listas: readonly (readonly string[])[]) =>
  Array.from(new Set(listas.flat()));

type Props = FiltrosDeMapa & { territorios: readonly TerritorioDeMapa[] };

/**
 * `<form method="get">` nativo, mismo criterio que `FiltrosDeReportes`: un
 * solo submit manda tipo/estado/area/lugar a la vez, sin JavaScript. `tipo` y
 * `estado` combinan el vocabulario de los dos recursos -el mapa decide a
 * cual aplica cada valor, no este formulario-. `lugar` va en el mismo
 * formulario a proposito: si viajara aparte, filtrar por tipo borraria el
 * territorio elegido de la URL.
 */
export function FormularioDeFiltrosDeMapa({
  tipo,
  estado,
  area,
  lugar,
  territorios,
}: Props) {
  return (
    <form
      method="get"
      className={`flex flex-wrap items-end gap-3 ${CLASES_DE_TARJETA}`}
    >
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
  );
}
