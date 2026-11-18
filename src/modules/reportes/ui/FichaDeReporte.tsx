import Link from "next/link";
import type { ReactNode } from "react";
import { fechaCivilCorta } from "@/shared/lib/fecha";
import {
  CLASES_DE_DATO,
  CLASES_DE_ENLACE,
  CLASES_DE_ETIQUETA,
} from "@/shared/ui";
import type { ReporteDeDetalle } from "../application/detalleDeReporte";
import type { UbicacionDeReporte } from "../application/puertosDeUbicacionesDeReporte";
import {
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  esTerminal,
  SIN_AREA,
} from "../domain";
import { InsigniaDeAtraso } from "./InsigniaDeAtraso";
import { InsigniaDeReporte } from "./InsigniaDeReporte";

type Props = {
  reporte: ReporteDeDetalle;
  /** Los dias que lleva sin atenderse, o `null`: la misma cuenta que la bandeja. */
  atraso: number | null;
};

type Enlace = { href: string; etiqueta: string };

const TITULO =
  "text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta";

const CLASES_DE_BLOQUE = "mt-5";

const VALOR = "mt-0.5 text-[15px] text-caliza-tinta";

/**
 * Las dos salidas de la ubicacion solo existen con calle: el historial es el
 * de la calle, y el mapa abre en la raiz de su lugar (S11). Un reporte
 * capturado por domicilio no tiene ninguna de las dos.
 */
const enlacesDeUbicacion = (
  ubicacion: UbicacionDeReporte,
): readonly Enlace[] => {
  if (ubicacion.calleId === null) return [];

  const historial = {
    href: `/calles/${ubicacion.calleId}/historial`,
    etiqueta: "Ver historial de la calle",
  };
  if (ubicacion.raizId === null) return [historial];

  return [
    historial,
    {
      href: `/mapa-operativo?lugar=${ubicacion.raizId}`,
      etiqueta: "Ver en el mapa",
    },
  ];
};

/** La linea bajo el folio: el tipo y donde ocurrio, en una sola lectura (S11). */
export const resumenDeUbicacion = (reporte: ReporteDeDetalle): string => {
  const tipo = ETIQUETA_DE_TIPO_DE_INCIDENCIA[reporte.tipo];
  const nombres = [
    reporte.ubicacion.calle ?? reporte.ubicacion.domicilio,
    reporte.ubicacion.lugar,
  ].filter((nombre): nombre is string => nombre !== null);

  return nombres.length === 0 ? tipo : `${tipo} en ${nombres.join(", ")}`;
};

/** Un par etiqueta/valor de la ficha; `ancho` para el que ocupa las dos columnas. */
function Par({
  etiqueta,
  ancho = false,
  children,
}: {
  etiqueta: string;
  ancho?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-0.5 ${ancho ? "sm:col-span-2" : ""}`}
    >
      <dt className={CLASES_DE_ETIQUETA}>{etiqueta}</dt>
      <dd className="break-words text-[15px] leading-[1.45] text-caliza-tinta">
        {children}
      </dd>
    </div>
  );
}

/**
 * «Ficha del reporte» (S11, S12, S15 de `reportes-ux`): el estado con la
 * misma insignia de la bandeja y el atraso al lado, los datos en pares
 * compactos y donde ocurrio con sus enlaces.
 *
 * Es una sola tarjeta -`CLASES_DE_TARJETA` prohibe anidarlas- y las agrupa
 * con tipografia y espacio, no con cajas adentro de cajas.
 */
export function FichaDeReporte({ reporte, atraso }: Props) {
  const { ubicacion } = reporte;
  const enlaces = enlacesDeUbicacion(ubicacion);
  const tituloDeUbicacion =
    ubicacion.calle ?? ubicacion.domicilio ?? ubicacion.lugar;

  return (
    <section className="rounded-lg border border-caliza-divisor bg-caliza-lienzo p-5 shadow-reposo">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-caliza-divisor pb-4">
        <h2 className={TITULO}>Ficha del reporte</h2>
        <span className="flex flex-wrap items-center gap-2">
          <InsigniaDeReporte estado={reporte.estado} />
          {atraso === null ? null : <InsigniaDeAtraso dias={atraso} />}
        </span>
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Par etiqueta="Tipo">
          {ETIQUETA_DE_TIPO_DE_INCIDENCIA[reporte.tipo]}
        </Par>
        <Par etiqueta="Área">
          {reporte.areaResponsable
            ? ETIQUETA_DE_AREA[reporte.areaResponsable]
            : SIN_AREA}
        </Par>
        <Par etiqueta="Fecha de registro" ancho>
          <span className={CLASES_DE_DATO}>
            {fechaCivilCorta(reporte.fechaDeRegistro)}
          </span>
        </Par>
      </dl>

      <div className="mt-5 rounded-md bg-caliza-superficie px-4 py-3">
        <p className={CLASES_DE_ETIQUETA}>Dónde ocurrió</p>
        <p className="mt-0.5 text-[15px] font-semibold text-caliza-tinta">
          {tituloDeUbicacion ?? "Sin ubicación registrada"}
        </p>
        {ubicacion.lugar && ubicacion.lugar !== tituloDeUbicacion ? (
          <p className={CLASES_DE_ETIQUETA}>{ubicacion.lugar}</p>
        ) : null}
        {enlaces.length === 0 ? null : (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={CLASES_DE_ENLACE}
              >
                {enlace.etiqueta}
              </Link>
            ))}
          </p>
        )}
      </div>

      <div className={CLASES_DE_BLOQUE}>
        <p className={CLASES_DE_ETIQUETA}>Descripción</p>
        <p className={VALOR}>{reporte.descripcion}</p>
      </div>

      {reporte.referencia ? (
        <div className={CLASES_DE_BLOQUE}>
          <p className={CLASES_DE_ETIQUETA}>Referencia</p>
          <p className={VALOR}>{reporte.referencia}</p>
        </div>
      ) : null}

      {esTerminal(reporte.estado) ? (
        <p
          className={`mt-5 border-t border-caliza-divisor pt-4 ${CLASES_DE_ETIQUETA}`}
        >
          Sin acciones: el reporte está cerrado.
        </p>
      ) : null}
    </section>
  );
}
