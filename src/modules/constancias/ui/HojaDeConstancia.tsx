import Link from "next/link";
import type { ReactNode } from "react";
import {
  fechaCivilCorta,
  fechaCivilLarga,
  fechaYHoraEnMerida,
} from "@/shared/lib/fecha";

/**
 * Lo que la hoja muestra, con la forma del snapshot guardado
 * (`datos.titular`, `datos.direccion`, `datos.firmante`) mas lo que solo
 * existe despues de emitir: `folio` y `emitidaEn`. Asi la vista previa de la
 * emision y la hoja del detalle se arman con los mismos campos y no pueden
 * divergir en la redaccion.
 */
export type DatosDeLaHojaDeConstancia = {
  municipio: string;
  /** `href` solo en el detalle: alli el titular enlaza a su ficha (S8). */
  titular: { nombreCompleto: string; href?: string };
  direccion: { texto: string; desdeEn: string };
  firmante: { nombre: string; cargo: string; leyendaDePie?: string };
  /** Ausente en la vista previa: sin emitir todavia no hay numero. */
  folio?: string;
  /** Ausente en la vista previa: la constancia no se ha emitido. */
  emitidaEn?: Date;
};

type Props = {
  datos: DatosDeLaHojaDeConstancia;
  /** El sello del estado (S7 del detalle). La hoja solo le abre el lugar. */
  sello?: ReactNode;
};

const Dato = ({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-[13px] font-medium text-caliza-apagada">{etiqueta}</dt>
    <dd className="font-mono text-[14px] tabular-nums text-caliza-tinta">
      {children}
    </dd>
  </div>
);

/**
 * La constancia como hoja de papel: membrete, titulo, el texto de la
 * plantilla, los datos de la residencia y el bloque de firma.
 *
 * **Es una sola hoja para dos pantallas** (S5 de `constancias-ux`, y la
 * direccion `design/constancias-detalle/02-hoja-sellada.html`): la vista
 * previa de la emision, donde todavia no hay folio, y la hoja del detalle,
 * donde lo hay y encima va el sello de vigente o cancelada. El texto es el de
 * `ConstanciaDeVecindadV1.tsx`, que es lo que se imprime: si la pantalla
 * dijera algo mas corto o distinto, la operadora aprobaria una hoja y se
 * entregaria otra.
 *
 * El membrete -escudo y nombre del municipio- va sobre lienzo y sin fondo de
 * color: es una de las plazas de la marca que `DESIGN.md` seccion 2 fija.
 */
export function HojaDeConstancia({ datos, sello }: Props) {
  const { titular, direccion, firmante } = datos;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-5 text-caliza-tinta shadow-reposo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-[15px] leading-tight font-semibold">
          {datos.municipio}
        </p>
        {sello}
      </div>

      <div className="h-px bg-caliza-divisor" aria-hidden="true" />

      <div className="flex flex-col gap-1">
        <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em]">
          Constancia de vecindad
        </h2>
        {datos.folio ? (
          <p className="font-mono text-[14px] tabular-nums text-caliza-apagada">
            Folio {datos.folio}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <p className="max-w-[60ch] text-[15px] leading-relaxed">
          Quien suscribe hace constar que{" "}
          {titular.href ? (
            <Link
              href={titular.href}
              className="font-semibold text-caliza-tinta underline underline-offset-2 hover:decoration-2"
            >
              {titular.nombreCompleto}
            </Link>
          ) : (
            <span className="font-semibold">{titular.nombreCompleto}</span>
          )}{" "}
          es vecino(a) de este municipio, con domicilio en {direccion.texto},
          desde el {fechaCivilLarga(direccion.desdeEn)}.
        </p>
        <p className="max-w-[60ch] text-[15px] leading-relaxed">
          Se expide la presente constancia a petición de la parte interesada,
          para los fines que a la persona convengan.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 rounded-md bg-caliza-superficie px-4 py-3 sm:grid-cols-2">
        <Dato etiqueta="Reside desde">
          {fechaCivilCorta(direccion.desdeEn)}
        </Dato>
        {datos.emitidaEn ? (
          <Dato etiqueta="Emitida">{fechaYHoraEnMerida(datos.emitidaEn)}</Dato>
        ) : null}
      </dl>

      <div className="mt-2 flex w-[220px] max-w-full flex-col gap-0.5 border-t border-caliza-tinta pt-2">
        <p className="text-[15px] font-semibold">{firmante.nombre}</p>
        <p className="text-[13px] text-caliza-apagada">{firmante.cargo}</p>
      </div>

      {firmante.leyendaDePie ? (
        <p className="text-[13px] text-caliza-apagada">
          {firmante.leyendaDePie}
        </p>
      ) : null}
    </article>
  );
}
