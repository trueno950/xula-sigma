import {
  type ColumnaDeTabla,
  type EstadoDeLista,
  EstadoVacio,
  type OpcionDeLista,
  Tabla,
} from "@/shared/ui";
import { fechaCivilDeInstante } from "../application/fechaCivil";
import type { FiltrosDeLaBandeja } from "../application/puertos";
import type { ReporteDeBandeja } from "../application/puertosDeUbicacionesDeReporte";
import {
  type ConteosDeReportes as Conteos,
  diasDeAtraso,
  type EstadoDeReporte,
  type OrdenDeReportes,
} from "../domain";
import { ChipsDeFiltros } from "./ChipsDeFiltros";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";
import { FilaDeReporte } from "./FilaDeReporte";
import { FiltrosDeReportes } from "./FiltrosDeReportes";
import {
  camposDeLaUrl,
  hrefDeEstado,
  hrefDeVerMas,
  type ParametrosDeListado,
} from "./hrefsDeListado";
import { type HrefsDeEstado, PestanasDeEstado } from "./PestanasDeEstado";
import { PliegueDeFiltrosDeReportes } from "./PliegueDeFiltrosDeReportes";

type Props = {
  reportes: readonly ReporteDeBandeja[];
  hayMas: boolean;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeLaBandeja;
  /** El umbral del municipio (`leerUmbralDeAtraso`) y el dia civil de hoy. */
  umbral: number;
  hoy: string;
  /** Las opciones del filtro de lugar: los lugares activos del municipio. */
  lugares: readonly OpcionDeLista[];
  /** Conteos **sin** el estado: lo que abriria cada pestaña (S2). */
  conteosPorEstado: Conteos;
  /** Conteos **sin** el area: lo que queda detras de cada opcion (S2). */
  conteosPorArea: Conteos;
  /** Los reportes atrasados con los otros filtros puestos (S1). */
  totalDeAtrasados: number;
  q?: string | undefined;
  orden?: OrdenDeReportes | undefined;
  limite?: number | undefined;
  soloAtrasados?: boolean | undefined;
};

/**
 * Las dos columnas con orden natural; la ubicacion de S4 va entre ellas y el
 * estado, y no se ordena porque no hay un orden del territorio que la
 * operadora pueda pedir.
 */
const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,1.4fr)" },
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,0.8fr)" },
  { clave: "ubicacion", etiqueta: "Ubicación", ancho: "minmax(0,1.5fr)" },
  // El estado lleva la insignia y, cuando aplica, la de atraso: es la
  // columna mas ancha a proposito, para que las dos quepan en el renglon.
  { clave: "estado", etiqueta: "Estado", ancho: "minmax(0,2.4fr)" },
  { clave: "area", etiqueta: "Área", ancho: "minmax(0,1.1fr)" },
  { clave: "registrado", etiqueta: "Registrado", ancho: "minmax(0,0.9fr)" },
];

/** Lo que el pliegue de S3 cuenta en «Filtros (N)»: todo menos el estado. */
const filtrosPuestos = (
  filtros: FiltrosDeLaBandeja,
  q: string | undefined,
  soloAtrasados: boolean,
): number =>
  [filtros.tipo, filtros.area, filtros.lugar, q].filter(Boolean).length +
  (soloAtrasados ? 1 : 0);

const hrefsDeEstado = (parametros: ParametrosDeListado): HrefsDeEstado => ({
  todos: hrefDeEstado(parametros, undefined),
  RECIBIDO: hrefDeEstado(parametros, "RECIBIDO"),
  EN_ATENCION: hrefDeEstado(parametros, "EN_ATENCION"),
  RESUELTO: hrefDeEstado(parametros, "RESUELTO"),
  RECHAZADO: hrefDeEstado(parametros, "RECHAZADO"),
});

/**
 * La bandeja de `reportes-ux` en la direccion elegida en L9: la banda de
 * pestañas por estado con sus conteos -que sustituye a la tarjeta de resumen
 * que no se podia tocar-, la barra de filtros en una fila, los chips de lo
 * que esta puesto, la tabla con donde ocurrio cada reporte y el pie con
 * cuantos se estan viendo del total.
 *
 * Los conteos llegan ya computados por Postgres con los filtros puestos y el
 * del propio eje quitado: contar aca seria contar la pagina visible, no el
 * municipio. Y los numeros de las pestañas y de las opciones de area se
 * recalculan junto con la lista, asi que no puede haber un numero viejo al
 * lado de una lista nueva.
 */
export function ListadoDeReportes({
  reportes,
  hayMas,
  estadoDeLista: estado,
  filtros,
  umbral,
  hoy,
  lugares,
  conteosPorEstado,
  conteosPorArea,
  totalDeAtrasados,
  q,
  orden,
  limite,
  soloAtrasados = false,
}: Props) {
  const parametros = { filtros, q, soloAtrasados, orden, limite };
  const columnas = resolverOrdenDeColumnas(COLUMNAS, parametros);
  const estadoPuesto: EstadoDeReporte | undefined = filtros.estado;
  const totalDelListado = estadoPuesto
    ? conteosPorEstado.porEstado[estadoPuesto]
    : conteosPorEstado.total;

  return (
    <div className="flex flex-col gap-4">
      <PestanasDeEstado
        {...(estadoPuesto ? { estado: estadoPuesto } : {})}
        conteos={conteosPorEstado}
        totalDeAtrasados={totalDeAtrasados}
        soloAtrasados={soloAtrasados}
        hrefs={hrefsDeEstado(parametros)}
        camposOcultos={camposDeLaUrl(parametros)}
      />

      <PliegueDeFiltrosDeReportes
        activos={filtrosPuestos(filtros, q, soloAtrasados)}
      >
        <FiltrosDeReportes
          {...filtros}
          q={q}
          lugares={lugares}
          porArea={conteosPorArea.porArea}
        />
      </PliegueDeFiltrosDeReportes>

      <ChipsDeFiltros
        filtros={filtros}
        lugares={lugares}
        q={q}
        soloAtrasados={soloAtrasados}
      />

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavía no hay reportes registrados."
          hrefSinFiltro="/reportes"
        />
      ) : (
        <>
          <Tabla
            etiqueta="Reportes ciudadanos"
            columnas={columnas}
            {...(hayMas ? { verMas: hrefDeVerMas(parametros) } : {})}
          >
            {reportes.map((reporte) => (
              <FilaDeReporte
                key={reporte.id}
                reporte={reporte}
                atraso={diasDeAtraso({
                  estado: reporte.estado,
                  fechaDeRegistro: fechaCivilDeInstante(reporte.registradoEn),
                  hoy,
                  umbral,
                })}
              />
            ))}
          </Tabla>
          <p className="text-[13px] leading-tight text-caliza-apagada">
            Mostrando{" "}
            <span className="font-mono tabular-nums">1–{reportes.length}</span>{" "}
            de <span className="font-mono tabular-nums">{totalDelListado}</span>{" "}
            reportes
          </p>
        </>
      )}
    </div>
  );
}
