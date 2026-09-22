import { Boton, CampoDeLista } from "@/shared/ui";
import type { FiltrosDeMapa } from "../application";
import {
  AREAS_PARA_FILTRO,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "../domain";

const opcionesDeCatalogo = (valores: readonly string[]) =>
  valores.map((valor) => ({ valor, etiqueta: valor }));
const combinar = (...listas: readonly (readonly string[])[]) =>
  Array.from(new Set(listas.flat()));

type Props = FiltrosDeMapa;

/**
 * `<form method="get">` nativo, mismo criterio que `FiltrosDeReportes`: un
 * solo submit manda tipo/estado/area a la vez, sin JavaScript. `tipo` y
 * `estado` combinan el vocabulario de los dos recursos -el mapa decide a
 * cual aplica cada valor, no este formulario-.
 */
export function FormularioDeFiltrosDeMapa({ tipo, estado, area }: Props) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
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
        etiqueta="Area"
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
