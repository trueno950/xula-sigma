import { ETIQUETA_DE_ESTADO_DE_REPORTE } from "../domain";
import type { ReporteSimilarParaCliente } from "./actions/buscarSimilaresAction";

type Props = {
  resultado: readonly ReporteSimilarParaCliente[];
  pendiente: boolean;
};

/**
 * La lista informativa del buscador (decision 15 de `proposal.md`): nunca
 * bloquea el envio, sin boton de "confirme que no es duplicado". El
 * operador puede escribir hasta el final y guardar sin mirarla, mismo
 * criterio que `SugerenciaDeDuplicados` de `padron`. Sin `"use client"`
 * propio: es parte de la isla que abre `SelectorDeUbicacionYTipo`.
 */
export function ReportesSimilares({ resultado, pendiente }: Props) {
  if (pendiente) {
    return (
      <p className="text-[13px] text-caliza-apagada">
        Buscando reportes similares...
      </p>
    );
  }

  if (resultado.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-senial-error/40 bg-caliza-superficie p-3">
      <p className="text-[13px] font-medium text-caliza-tinta">
        {resultado.length === 1
          ? "Hay 1 reporte abierto similar en este lugar:"
          : `Hay ${resultado.length} reportes abiertos similares en este lugar:`}
      </p>
      <ul className="flex flex-col gap-1">
        {resultado.map((reporte) => (
          <li key={reporte.id} className="text-[13px] text-caliza-apagada">
            <span className="font-mono">{reporte.folio}</span> —{" "}
            {reporte.descripcion} (
            {ETIQUETA_DE_ESTADO_DE_REPORTE[reporte.estado]})
          </li>
        ))}
      </ul>
    </div>
  );
}
