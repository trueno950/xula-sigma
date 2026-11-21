import { CLASES_DE_DATO } from "@/shared/ui";
import { formatearFilas } from "./mensajesDeDescarga";

type Props = { archivo: string; archivos: number; filas: number };

/**
 * La linea de resumen de S11 y S12: el nombre del archivo que se va a
 * descargar —el definitivo, el mismo que pone el borde— y lo que lleva
 * adentro, todo junto para que se lea de un vistazo.
 *
 * Dice que se arma al pedirlo porque es cierto y porque explica la espera:
 * no hay un ZIP guardado que se repita.
 */
export function ResumenDeLaExportacion({ archivo, archivos, filas }: Props) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="text-[15px] text-caliza-tinta">
        <span className={`${CLASES_DE_DATO} font-semibold text-caliza-tinta`}>
          {archivo}
        </span>
        <span className="text-caliza-apagada"> · </span>
        {`${formatearFilas(archivos)} archivos · ${formatearFilas(filas)} filas`}
      </p>
      <p className="max-w-[56ch] text-[13px] leading-[1.4] text-caliza-apagada">
        El nombre es el del municipio y el día en que se genera. El archivo se
        arma al pedirlo y tarda unos segundos.
      </p>
    </div>
  );
}
