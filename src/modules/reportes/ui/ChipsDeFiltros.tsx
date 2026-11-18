import { ChipDeFiltro, type OpcionDeLista } from "@/shared/ui";
import type { FiltrosDeLaBandeja } from "../application/puertos";
import { ETIQUETA_DE_AREA, ETIQUETA_DE_TIPO_DE_INCIDENCIA } from "../domain";
import { hrefSinFiltro } from "./hrefsDeListado";

type Props = {
  filtros: FiltrosDeLaBandeja;
  lugares: readonly OpcionDeLista[];
  q?: string | undefined;
  soloAtrasados?: boolean | undefined;
};

/**
 * Los chips de los filtros puestos (`design.md`, "Filtros"): el `<select>`
 * captura y el chip dice que el filtro esta aplicado -sin el, un `<select>`
 * que cambia de valor se lee como la lista completa-. Cada chip se quita solo
 * a si mismo y conserva los demas.
 *
 * Vive aparte de `FiltrosDeReportes` porque son varios filtros y el formulario
 * mas los chips en un solo componente pasaban la metrica de complejidad de
 * Biome; ademas es la parte que la pantalla comparte con el vacio por filtro.
 *
 * El estado **no** lleva chip: vive en las pestañas de `PestanasDeEstado`, que
 * ya dicen cual esta puesta, y un segundo control que quitara lo mismo que la
 * pestaña seria dos maneras de hacer lo mismo con dos numeros que pueden
 * discrepar.
 */
export function ChipsDeFiltros({ filtros, lugares, q, soloAtrasados }: Props) {
  const { tipo, area, lugar } = filtros;
  const etiquetaDelLugar = lugares.find(
    (opcion) => opcion.valor === lugar,
  )?.etiqueta;

  if (!tipo && !area && !lugar && !soloAtrasados) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tipo ? (
        <ChipDeFiltro
          etiqueta={`Tipo: ${ETIQUETA_DE_TIPO_DE_INCIDENCIA[tipo]}`}
          hrefQuitar={hrefSinFiltro({ filtros, q }, "tipo")}
        />
      ) : null}
      {area ? (
        <ChipDeFiltro
          etiqueta={`Área: ${ETIQUETA_DE_AREA[area]}`}
          hrefQuitar={hrefSinFiltro({ filtros, q }, "area")}
        />
      ) : null}
      {lugar ? (
        <ChipDeFiltro
          etiqueta={`Lugar: ${etiquetaDelLugar ?? "elegido"}`}
          hrefQuitar={hrefSinFiltro({ filtros, q }, "lugar")}
        />
      ) : null}
      {soloAtrasados ? (
        <ChipDeFiltro
          etiqueta="Solo atrasados"
          hrefQuitar={hrefSinFiltro({ filtros, q, soloAtrasados }, "atrasados")}
        />
      ) : null}
    </div>
  );
}
