import type { ReactNode } from "react";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import {
  ETIQUETA_DE_MOTIVO_DE_CANCELACION,
  type MotivoDeCancelacion,
} from "../domain";

type Props = {
  folio: string;
  emitidaEn: Date;
  canceladaEn: Date | null;
  motivoCancelacion: MotivoDeCancelacion | null;
};

const Movimiento = ({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) => (
  <li className="flex gap-3">
    <span
      aria-hidden="true"
      className="mt-1 h-3 w-3 shrink-0 rounded-pill border-2 border-caliza-tinta bg-caliza-tinta"
    />
    <div className="flex flex-col gap-0.5 pb-5">
      <p className="text-[15px] font-semibold text-caliza-tinta">{titulo}</p>
      <p className="font-mono text-[14px] tabular-nums text-caliza-apagada">
        {children}
      </p>
    </div>
  </li>
);

/**
 * El historial del documento con lo que el modelo de lectura ya devuelve:
 * la emision y, si la hay, la cancelacion. No se agrega una lectura nueva
 * ni una tabla de movimientos -`constancias-ux` las excluye-: el expediente
 * muestra lo que ya esta guardado en la fila.
 *
 * Una reimpresion no aparece porque `constanciaPorId` no la trae; el sello
 * de cada hoja reimpresa es lo que la distingue en el PDF.
 */
export function HistorialDeConstancia({
  folio,
  emitidaEn,
  canceladaEn,
  motivoCancelacion,
}: Props) {
  return (
    <section
      aria-labelledby="historial-de-la-constancia"
      className="flex flex-col gap-1"
    >
      <h2
        id="historial-de-la-constancia"
        className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta"
      >
        Historial del documento
      </h2>
      <ol className="mt-3 flex flex-col">
        <Movimiento titulo="Constancia emitida">
          {fechaYHoraEnMerida(emitidaEn)} · {folio}
        </Movimiento>
        {canceladaEn ? (
          <Movimiento titulo="Constancia cancelada">
            {fechaYHoraEnMerida(canceladaEn)}
            {motivoCancelacion
              ? ` · Motivo: ${ETIQUETA_DE_MOTIVO_DE_CANCELACION[motivoCancelacion]}`
              : null}
          </Movimiento>
        ) : null}
      </ol>
    </section>
  );
}
