import { fechaEnMerida } from "@/shared/lib/fecha";
import {
  CeldaDeApoyo,
  CeldaDeDato,
  CeldaPrincipal,
  FilaDeTabla,
} from "@/shared/ui";
import type {
  ReporteDeBandeja,
  UbicacionDeReporte,
} from "../application/puertosDeUbicacionesDeReporte";
import {
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  SIN_AREA,
} from "../domain";
import { CeldaDeEstado } from "./CeldaDeEstado";
import { InsigniaDeAtraso } from "./InsigniaDeAtraso";
import { InsigniaDeReporte } from "./InsigniaDeReporte";

type Props = {
  reporte: ReporteDeBandeja;
  /** Los dias que lleva sin atenderse, o `null`: lo calcula la lista (S1). */
  atraso: number | null;
};

const SIN_UBICACION = "Sin ubicación registrada";

/**
 * Donde ocurrio, en una linea (S4): el lugar y la calle, o el domicilio tal
 * como se registro. Un nombre que ya no esta en el catalogo se omite en vez
 * de dejar un separador colgando.
 */
const textoDeUbicacion = (ubicacion: UbicacionDeReporte): string => {
  const detalle =
    ubicacion.modo === "DOMICILIO"
      ? ubicacion.domicilio && `Domicilio registrado: ${ubicacion.domicilio}`
      : ubicacion.calle;

  const partes = [ubicacion.lugar, detalle].filter((parte): parte is string =>
    Boolean(parte),
  );

  return partes.length === 0 ? SIN_UBICACION : partes.join(" · ");
};

/**
 * Una fila de la bandeja, con las dos lecturas que pide S1 y S6.
 *
 * - **Escritorio**: seis celdas en la cuadricula de `Tabla`, con la columna
 *   «Ubicación» de S4 y el atraso adentro de la celda de estado -no en un
 *   segundo renglon-, asi que todas las filas miden lo mismo.
 * - **Telefono**: tres renglones en la fila compacta del diseno -folio y
 *   estado; tipo y ubicacion; fecha y atraso- porque a 390px seis columnas no
 *   caben y la lista tiene que entrar en la primera pantalla.
 *
 * Las dos versiones conviven en el HTML y una se oculta por ancho. El nombre
 * accesible de la fila -`etiquetaAccesible`- se arma una sola vez y con todo
 * lo que hay adentro: el lector de pantalla no lee las dos, ni lee «REP-»
 * pegado al tipo.
 */
export function FilaDeReporte({ reporte, atraso }: Props) {
  const tipo = ETIQUETA_DE_TIPO_DE_INCIDENCIA[reporte.tipo];
  const area = reporte.areaResponsable
    ? ETIQUETA_DE_AREA[reporte.areaResponsable]
    : SIN_AREA;
  const lugar = textoDeUbicacion(reporte.ubicacion);
  const fecha = fechaEnMerida(reporte.registradoEn);

  const etiquetaAccesible = [
    reporte.folio,
    tipo,
    lugar.replace(" · ", ", "),
    atraso === null ? null : `atrasado ${atraso} días`,
    area,
    fecha,
  ]
    .filter((parte): parte is string => parte !== null)
    .join(" · ");

  return (
    <FilaDeTabla
      href={`/reportes/detalle/${reporte.id}`}
      etiquetaAccesible={etiquetaAccesible}
    >
      <span className="flex min-w-0 items-center gap-2 sm:hidden">
        <span className="min-w-0 flex-1 truncate font-mono text-[15px] tabular-nums text-caliza-tinta">
          {reporte.folio}
        </span>
        <span className="flex-none">
          <InsigniaDeReporte estado={reporte.estado} />
        </span>
      </span>
      <span className="text-[15px] text-caliza-tinta sm:hidden">
        {tipo} · {lugar.replace(" · ", ", ")}
      </span>
      <span className="flex flex-wrap items-baseline gap-2 text-[13px] text-caliza-apagada sm:hidden">
        {fecha}
        {atraso === null ? null : <InsigniaDeAtraso dias={atraso} />}
      </span>

      <span className="hidden sm:flex">
        <CeldaPrincipal>{reporte.folio}</CeldaPrincipal>
      </span>
      <span className="hidden sm:flex">
        <CeldaDeApoyo>{tipo}</CeldaDeApoyo>
      </span>
      <span className="hidden sm:flex sm:min-w-0">
        <CeldaDeApoyo>{lugar}</CeldaDeApoyo>
      </span>
      <span className="hidden sm:flex">
        <CeldaDeEstado estado={reporte.estado} atraso={atraso} />
      </span>
      <span className="hidden sm:flex">
        <CeldaDeApoyo>{area}</CeldaDeApoyo>
      </span>
      <span className="hidden sm:flex">
        <CeldaDeDato>{fecha}</CeldaDeDato>
      </span>
    </FilaDeTabla>
  );
}
