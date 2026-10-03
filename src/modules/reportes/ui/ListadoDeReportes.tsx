import { fechaEnMerida } from "@/shared/lib/fecha";
import {
  CeldaDeApoyo,
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  type EstadoDeLista,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { FiltrosDeListado, ReporteGuardado } from "../application/puertos";
import {
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  type OrdenDeReportes,
  SIN_AREA,
} from "../domain";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";
import { FiltrosDeReportes } from "./FiltrosDeReportes";
import { hrefDeVerMas } from "./hrefsDeListado";
import { InsigniaDeReporte } from "./InsigniaDeReporte";

type Props = {
  reportes: readonly ReporteGuardado[];
  hayMas: boolean;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeListado;
  q?: string | undefined;
  orden?: OrdenDeReportes | undefined;
  limite?: number | undefined;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,2fr)" },
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,1fr)" },
  { clave: "estado", etiqueta: "Estado", ancho: "minmax(0,1fr)" },
  { clave: "area", etiqueta: "Área", ancho: "minmax(0,1fr)" },
  { clave: "registrado", etiqueta: "Registrado", ancho: "minmax(0,1fr)" },
];

/**
 * Listado con busqueda (`?q=`), filtros por `estado`/`tipo` (con su chip),
 * paginacion (`?limite=`) y orden (`?ordenar=&direccion=`) -las cuatro
 * secciones de `design.md` que esta rebanada agrega sobre el listado con
 * solo filtros de la Fase 4. Un reporte sin area dice "Sin asignar" para
 * todos los roles: antes solo quien puede asignarla lo leia asi y el resto
 * veia un guion, dos lecturas distintas del mismo dato.
 */
export function ListadoDeReportes({
  reportes,
  hayMas,
  estadoDeLista: estado,
  filtros,
  q,
  orden,
  limite,
}: Props) {
  const columnas = resolverOrdenDeColumnas(COLUMNAS, { orden, filtros, q });

  return (
    <div className="flex flex-col gap-4">
      <FiltrosDeReportes {...filtros} q={q} />

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavía no hay reportes registrados."
          hrefSinFiltro="/reportes"
        />
      ) : (
        <Tabla
          etiqueta="Reportes ciudadanos"
          columnas={columnas}
          {...(hayMas
            ? { verMas: hrefDeVerMas({ filtros, q, limite, orden }) }
            : {})}
        >
          {reportes.map((reporte) => (
            <FilaDeTabla
              key={reporte.id}
              href={`/reportes/detalle/${reporte.id}`}
            >
              <CeldaPrincipal>{reporte.folio}</CeldaPrincipal>
              <CeldaDeApoyo>
                {ETIQUETA_DE_TIPO_DE_INCIDENCIA[reporte.tipo]}
              </CeldaDeApoyo>
              <InsigniaDeReporte estado={reporte.estado} />
              <CeldaDeApoyo>
                {reporte.areaResponsable
                  ? ETIQUETA_DE_AREA[reporte.areaResponsable]
                  : SIN_AREA}
              </CeldaDeApoyo>
              <CeldaDeDato>{fechaEnMerida(reporte.registradoEn)}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </div>
  );
}
