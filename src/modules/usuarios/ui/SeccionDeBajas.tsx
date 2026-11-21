import { fechaEnMerida } from "@/shared/lib/fecha";
import { InsigniaDeEstado } from "@/shared/ui";
import type { UsuarioDelPanel } from "../domain";
import { pluralizar } from "./pluralizar";

/**
 * Las cuentas de baja, aparte y al final (S5 de `usuarios-ux`).
 *
 * **Cada fila dice desde cuando**, que es el dato que la auditoria echo de
 * menos (L6): una cuenta marcada «De baja» sin fecha no distingue la baja de
 * ayer de la de hace dos años. La fecha sale de `bajaEn` y se formatea por
 * `shared/lib/fecha`: el servidor corre en UTC y la fecha civil es la de
 * Merida.
 *
 * **No ofrecen acciones**, y el bloque lo dice: reactivar una cuenta esta
 * fuera de esta rebanada, y una fila sin botones sin explicacion se lee como
 * una pantalla rota. Una cuenta de baja tampoco es un cajon: lleva su conteo
 * y sus nombres, como los grupos por rol.
 */

const CLASES_DE_LISTA =
  "overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo " +
  "shadow-reposo [&>li+li]:border-t [&>li+li]:border-caliza-divisor";

const NO_ENTRAN =
  "No entran al panel y no ofrecen acciones; reactivar una cuenta queda para otra rebanada.";

const desdeCuando = (bajaEn: Date | null): string =>
  bajaEn ? `de baja desde el ${fechaEnMerida(bajaEn)}` : "de baja";

export function SeccionDeBajas({
  bajas,
}: {
  bajas: readonly UsuarioDelPanel[];
}) {
  if (bajas.length === 0) return null;

  const id = "cuentas-de-baja";

  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id={id}
          className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta"
        >
          Cuentas de baja
        </h2>
        <span className="font-mono text-[13px] font-medium text-caliza-apagada">
          {pluralizar(bajas.length, "cuenta", "cuentas")}
        </span>
      </div>
      <p className="max-w-[66ch] text-[13px] leading-[1.4] text-caliza-apagada">
        {NO_ENTRAN}
      </p>
      <ul className={CLASES_DE_LISTA}>
        {bajas.map((usuario) => (
          <li
            key={usuario.id}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-caliza-apagada">
                {usuario.nombre}
              </span>
              <span className="truncate text-[13px] text-caliza-apagada">
                {usuario.email}
              </span>
            </span>
            <span className="flex flex-col gap-1 sm:items-end">
              <InsigniaDeEstado tono="error" etiqueta="De baja" />
              <span className="font-mono text-[13px] text-caliza-apagada">
                {desdeCuando(usuario.bajaEn)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
