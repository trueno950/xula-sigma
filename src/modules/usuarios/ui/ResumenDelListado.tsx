import type { ListadoAgrupado } from "./agrupacionDelListado";
import { pluralizar } from "./pluralizar";

/**
 * El conteo y el orden, arriba de la lista (S4 de `usuarios-ux`).
 *
 * **Un cero es un dato**: con seis cuentas y ninguna de baja, la linea dice
 * «0 de baja» en vez de esquivar el tema, y la seccion de bajas no se pinta.
 *
 * **El orden esta escrito** porque el diseño lo rompe a proposito: las
 * activas se agrupan por rol y no alfabeticamente (tradeoff declarado en
 * `design/usuarios-listado/02-agrupado-por-rol.html`), asi que hay que saber
 * el rol antes de buscar un nombre, y quien no lo sepa tiene que poder
 * leerlo.
 */

export const ORDEN_DEL_LISTADO =
  "Orden: las activas por rol —administrador, operador, consulta— y dentro de cada rol por nombre; las de baja van al final, aparte, de la más reciente a la más antigua.";

export function ResumenDelListado({ resumen }: { resumen: ListadoAgrupado }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-[15px] text-caliza-tinta">
        <span>{pluralizar(resumen.total, "cuenta", "cuentas")}</span>
        <span aria-hidden="true" className="text-caliza-apagada">
          ·
        </span>
        <span>{pluralizar(resumen.activas, "activa", "activas")}</span>
        <span aria-hidden="true" className="text-caliza-apagada">
          ·
        </span>
        <span>{pluralizar(resumen.deBaja, "de baja", "de baja")}</span>
      </p>
      <p className="max-w-[58ch] text-[13px] leading-[1.4] text-caliza-apagada">
        {ORDEN_DEL_LISTADO}
      </p>
    </div>
  );
}
