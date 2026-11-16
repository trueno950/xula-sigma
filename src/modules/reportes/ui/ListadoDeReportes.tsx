import { fechaEnMerida } from "@/shared/lib/fecha";
import {
  CeldaDeApoyo,
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  type EstadoDeLista,
  EstadoVacio,
  FilaDeTabla,
  type OpcionDeLista,
  Tabla,
} from "@/shared/ui";
import { fechaCivilDeInstante } from "../application/fechaCivil";
import type {
  FiltrosDeLaBandeja,
  ReporteGuardado,
} from "../application/puertos";
import {
  type ConteosDeReportes as Conteos,
  diasDeAtraso,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  type OrdenDeReportes,
  SIN_AREA,
} from "../domain";
import { CeldaDeEstado } from "./CeldaDeEstado";
import { ConteosDeReportes } from "./ConteosDeReportes";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";
import { FiltrosDeReportes } from "./FiltrosDeReportes";
import { hrefDeVerMas } from "./hrefsDeListado";

type Props = {
  reportes: readonly ReporteGuardado[];
  hayMas: boolean;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeLaBandeja;
  /** El umbral del municipio (`leerUmbralDeAtraso`) y el dia civil de hoy. */
  umbral: number;
  hoy: string;
  /** Las opciones del filtro de lugar: los lugares activos del municipio. */
  lugares: readonly OpcionDeLista[];
  /** Los conteos por estado y por area de los filtros elegidos (S2). */
  conteos: Conteos;
  q?: string | undefined;
  orden?: OrdenDeReportes | undefined;
  limite?: number | undefined;
  soloAtrasados?: boolean | undefined;
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
 * «solo atrasados» (S1 de `gestion-municipal`), paginacion (`?limite=`) y
 * orden (`?ordenar=&direccion=`) -las secciones de `design.md` "Filtros",
 * "Buscador", "Paginacion" y "Ordenamiento de columnas". Un reporte sin
 * area dice "Sin asignar" para todos los roles: antes solo quien puede
 * asignarla lo leia asi y el resto veia un guion, dos lecturas distintas del
 * mismo dato.
 *
 * La insignia de atraso se calcula aca, con el umbral y el dia civil que
 * llegan por props, y no en el repositorio: el filtro ya lo aplico SQL, y lo
 * que falta es cuanto lleva cada fila para contarlo en la insignia.
 *
 * S2 suma los dos filtros nuevos -lugar y area responsable- y los conteos por
 * estado y por area, que llegan ya computados: contarlos aca seria contar la
 * pagina, no el municipio.
 */
export function ListadoDeReportes({
  reportes,
  hayMas,
  estadoDeLista: estado,
  filtros,
  umbral,
  hoy,
  lugares,
  conteos,
  q,
  orden,
  limite,
  soloAtrasados,
}: Props) {
  const columnas = resolverOrdenDeColumnas(COLUMNAS, {
    orden,
    filtros,
    q,
    soloAtrasados,
  });

  return (
    <div className="flex flex-col gap-4">
      <FiltrosDeReportes
        {...filtros}
        q={q}
        soloAtrasados={soloAtrasados}
        lugares={lugares}
      />

      <ConteosDeReportes conteos={conteos} />

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
            ? {
                verMas: hrefDeVerMas({
                  filtros,
                  q,
                  limite,
                  orden,
                  soloAtrasados,
                }),
              }
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
              <CeldaDeEstado
                estado={reporte.estado}
                atraso={diasDeAtraso({
                  estado: reporte.estado,
                  fechaDeRegistro: fechaCivilDeInstante(reporte.registradoEn),
                  hoy,
                  umbral,
                })}
              />
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
