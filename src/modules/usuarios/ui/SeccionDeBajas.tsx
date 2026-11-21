import { ArrowCounterClockwise } from "@phosphor-icons/react/ssr";
import type { Rol } from "@/shared/auth/roles";
import { fechaEnMerida } from "@/shared/lib/fecha";
import { Boton, InsigniaDeEstado } from "@/shared/ui";
import type { UsuarioDelPanel } from "../domain";
import { reactivarUsuarioAction } from "./actions/reactivarUsuarioAction";
import { CasillaDeConfirmacion } from "./CasillaDeConfirmacion";
import { puedeReactivar } from "./permisosDeCuenta";
import { pluralizar } from "./pluralizar";

/**
 * Las cuentas de baja, aparte y al final (S5 de `usuarios-ux`), y **el unico
 * lugar desde donde se reactivan** (S3).
 *
 * **Cada fila dice desde cuando**, que es el dato que la auditoria echo de
 * menos (L6): una cuenta marcada «De baja» sin fecha no distingue la baja de
 * ayer de la de hace dos años. La fecha sale de `bajaEn` y se formatea por
 * `shared/lib/fecha`: el servidor corre en UTC y la fecha civil es la de
 * Merida.
 *
 * **Reactivar emite una clave nueva, no devuelve la de antes.** Por eso la
 * fila no ofrece «Restablecer»: quien vuelve al panel entra con una temporal
 * y la cambia al entrar (S2), y dos botones que emiten claves serian dos
 * caminos para el mismo hecho. Lo que decide si el boton se pinta es
 * `puedeReactivar`, la misma regla que corre el caso de uso.
 *
 * **La confirmacion se pide igual que en la baja** —una casilla `required`
 * que nombra a la persona, y el servidor que la vuelve a exigir—: reactivar
 * deja a alguien adentro con una clave que la operadora va a dictar, y sin
 * JavaScript no hay dialogo que pregunte antes.
 */

const CLASES_DE_LISTA =
  "overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo " +
  "shadow-reposo [&>li+li]:border-t [&>li+li]:border-caliza-divisor";

const NO_ENTRAN =
  "No entran al panel mientras estén de baja. Reactivarlas las devuelve con una contraseña temporal nueva.";

const desdeCuando = (bajaEn: Date | null): string =>
  bajaEn ? `de baja desde el ${fechaEnMerida(bajaEn)}` : "de baja";

export function SeccionDeBajas({
  bajas,
  actor,
}: {
  bajas: readonly UsuarioDelPanel[];
  actor: { id: string; rol: Rol };
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
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
            {puedeReactivar(actor, usuario) ? (
              <form
                action={reactivarUsuarioAction}
                className="flex shrink-0 flex-col gap-2"
              >
                <input type="hidden" name="usuarioId" value={usuario.id} />
                <CasillaDeConfirmacion
                  nombre={usuario.nombre}
                  accion="reactivar"
                />
                <Boton type="submit" variante="secundaria">
                  <ArrowCounterClockwise
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                  />
                  Reactivar cuenta
                  <span className="sr-only">{` de ${usuario.nombre}`}</span>
                </Boton>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
