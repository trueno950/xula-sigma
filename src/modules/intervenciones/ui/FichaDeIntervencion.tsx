import Link from "next/link";
import type { ReactNode } from "react";
import { fechaCivilCorta, fechaYHoraEnMerida } from "@/shared/lib/fecha";
import {
  CLASES_DE_DATO,
  CLASES_DE_ENLACE,
  CLASES_DE_ETIQUETA,
} from "@/shared/ui";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";
import type { IntervencionGuardada } from "../application/puertos";
import type { AutorDeIntervencion } from "../application/puertosDeHistorial";
import type { ReferenciasDeIntervencion } from "../application/puertosDeLectura";
import { ETIQUETA_DE_TIPO_DE_INTERVENCION } from "../domain";
import { EnlacesDeLaUbicacion, NO_DISPONIBLE } from "./EnlacesDeLaUbicacion";

type Props = {
  intervencion: IntervencionGuardada;
  referencias: ReferenciasDeIntervencion;
  /** Quien la registro, con su rol: el bloque de sistema de S14. */
  registradaPor: AutorDeIntervencion | null;
};

const TITULO =
  "text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta";

const VALOR = "mt-0.5 text-[15px] text-caliza-tinta";

const enlaceAlReporte = (
  intervencion: IntervencionGuardada,
  reporte: ReferenciasDeIntervencion["reporte"],
): ReactNode => {
  if (intervencion.reporteId === null) return "Sin reporte";
  if (reporte === null) return NO_DISPONIBLE;

  return (
    <Link href={`/reportes/detalle/${reporte.id}`} className={CLASES_DE_ENLACE}>
      {reporte.folio}
    </Link>
  );
};

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
 * «El hecho» y «Registro del sistema» (S14): los datos de la obra separados
 * de los metadatos de la captura, en una sola tarjeta -`CLASES_DE_TARJETA`
 * prohibe anidarlas-, con la fecha de ocurrencia y los momentos en el mismo
 * formato de `shared/lib/fecha`.
 *
 * El tipo y la fecha de ocurrencia son del hecho; «registrada el», «ultima
 * actualizacion» y «registrada por» dicen quien capturo y cuando, no que se
 * hizo, y por eso van al pie con su propio rotulo.
 */
export function FichaDeIntervencion({
  intervencion,
  referencias,
  registradaPor,
}: Props) {
  return (
    <section className="rounded-lg border border-caliza-divisor bg-caliza-lienzo p-5 shadow-reposo">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 border-b border-caliza-divisor pb-3">
        <h2 className={TITULO}>El hecho</h2>
        <span className={CLASES_DE_ETIQUETA}>Lo que se hace y dónde</span>
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Par etiqueta="Tipo">
          {ETIQUETA_DE_TIPO_DE_INTERVENCION[intervencion.tipo]}
        </Par>
        <Par etiqueta="Fecha de ocurrencia">
          <span className={CLASES_DE_DATO}>
            {fechaCivilCorta(intervencion.fechaDeOcurrencia)}
          </span>
        </Par>
        <Par etiqueta="Descripción" ancho>
          {intervencion.descripcion}
        </Par>
        <Par etiqueta="Reporte de origen" ancho>
          {enlaceAlReporte(intervencion, referencias.reporte)}
        </Par>
      </dl>

      <EnlacesDeLaUbicacion
        intervencion={intervencion}
        referencias={referencias}
      />

      <div className="mt-5 border-t border-caliza-divisor pt-3">
        <p className={CLASES_DE_ETIQUETA}>
          Registro del sistema · no es un dato de la obra
        </p>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Par etiqueta="Registrada el">
            <span className={CLASES_DE_DATO}>
              {fechaYHoraEnMerida(intervencion.capturadoEn)}
            </span>
          </Par>
          <Par etiqueta="Última actualización">
            <span className={CLASES_DE_DATO}>
              {fechaYHoraEnMerida(intervencion.actualizadoEn)}
            </span>
          </Par>
          <Par etiqueta="Registrada por" ancho>
            <span className={VALOR}>
              {registradaPor
                ? `${registradaPor.nombre} · ${etiquetaDeRol(registradaPor.rol)}`
                : NO_DISPONIBLE}
            </span>
          </Par>
        </dl>
      </div>
    </section>
  );
}
