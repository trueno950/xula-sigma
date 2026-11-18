import { fechaEnMerida } from "@/shared/lib/fecha";
import { CeldaDeDato, CeldaPrincipal, FilaDeTabla } from "@/shared/ui";
import type { ConstanciaGuardada } from "../application/puertos";
import { ETIQUETA_DE_ESTADO_DE_CONSTANCIA } from "../domain";
import { InsigniaDeConstancia } from "./InsigniaDeConstancia";

type Props = {
  constancia: ConstanciaGuardada;
};

/**
 * Una constancia del listado: folio, estado, titular y fecha de emision.
 *
 * En el telefono son tres renglones, y el primero lleva folio y estado
 * juntos: para eso el grupo se disuelve en columnas desde `sm`
 * (`sm:contents`). Cada celda declara su columna **y su renglon** porque el
 * cursor del acomodo automatico no vuelve atras: con solo la columna, el
 * titular y la fecha caian al renglon siguiente; y el chevron de
 * `FilaDeTabla` queda en la ultima columna, que ninguna celda ocupa (S1).
 *
 * La fecha civil se lee en `America/Merida`, nunca en UTC
 * (`shared/lib/fecha`): el servidor corre en UTC y una emision de las 19:00
 * del 31 de diciembre caeria en el anio siguiente.
 */
export function FilaDeConstancia({ constancia }: Props) {
  const estado = ETIQUETA_DE_ESTADO_DE_CONSTANCIA[constancia.estado];

  return (
    <FilaDeTabla
      href={`/constancias/${constancia.id}`}
      etiquetaAccesible={`Abrir la constancia ${constancia.folio} de ${constancia.nombreDelTitular}, ${estado}`}
    >
      <span className="flex min-w-0 items-center gap-2 sm:contents">
        <span className="truncate font-mono text-[14px] text-caliza-tinta tabular-nums sm:col-start-1 sm:row-start-1">
          {constancia.folio}
        </span>
        <span className="flex min-w-0 sm:col-start-3 sm:row-start-1">
          <InsigniaDeConstancia cancelada={Boolean(constancia.canceladaEn)} />
        </span>
      </span>
      <span className="flex min-w-0 [&>*]:min-w-0 sm:col-start-2 sm:row-start-1">
        <CeldaPrincipal>{constancia.nombreDelTitular}</CeldaPrincipal>
      </span>
      <span className="flex min-w-0 sm:col-start-4 sm:row-start-1">
        <CeldaDeDato>{fechaEnMerida(constancia.emitidaEn)}</CeldaDeDato>
      </span>
    </FilaDeTabla>
  );
}
