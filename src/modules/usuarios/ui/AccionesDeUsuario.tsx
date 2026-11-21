import { ANILLO_DE_FOCO, Boton } from "@/shared/ui";
import { darDeBajaUsuarioAction } from "./actions/darDeBajaUsuarioAction";
import { restablecerContraseniaAction } from "./actions/restablecerContraseniaAction";

/**
 * Las acciones del panel de una cuenta (S2, S3, S5 y S6), cada una en su
 * propio `<form>` nativo: un formulario no puede enviarse a dos acciones
 * distintas, y anidar formularios no es HTML valido.
 *
 * **Quien decide que se ofrece es quien compone la fila**, no este
 * componente: la regla de rol, la de la propia cuenta y la de la baja dadas
 * viven en `permisosDeCuenta`. Aca solo se pinta lo que llega permitido — y
 * si no llega nada, no se pinta nada.
 *
 * **«Dar de baja» va al final, detras de su linea** y con contorno de
 * peligro (S2): es la unica accion de la pantalla que deja a alguien afuera,
 * y un boton rojo pegado a «Restablecer contraseña» se pulsa por error.
 *
 * **Cada boton dice de quien es** en un texto que solo lee el lector de
 * pantalla (S3): la vista ya esta dentro de la fila de esa persona, pero la
 * lista de botones de un lector de pantalla es una lista, y «Restablecer
 * contraseña» repetido seis veces no dice a quien restablece.
 *
 * Sin `"use client"` en ningun lado: el envio es el POST nativo del
 * navegador y el resultado vuelve por `redirect` + `searchParams`, que es la
 * excepcion de `AGENTS.md` para las Server Actions de formulario nativo.
 *
 * El `usuarioId` va en un campo oculto, nunca en la URL: la accion lo valida
 * como uuid y el caso de uso lo resuelve bajo RLS (S7).
 */
export function AccionesDeUsuario({
  usuarioId,
  nombre,
  puedeRestablecer,
  puedeBaja,
}: {
  usuarioId: string;
  nombre: string;
  puedeRestablecer: boolean;
  puedeBaja: boolean;
}) {
  if (!puedeRestablecer && !puedeBaja) return null;

  return (
    <div className="flex flex-col gap-3">
      {puedeRestablecer ? (
        <form action={restablecerContraseniaAction}>
          <input type="hidden" name="usuarioId" value={usuarioId} />
          <Boton type="submit" variante="secundaria">
            Restablecer contraseña
            <span className="sr-only">{` de ${nombre}`}</span>
          </Boton>
        </form>
      ) : null}
      {puedeBaja ? (
        <form
          action={darDeBajaUsuarioAction}
          className="flex flex-col gap-2 border-t border-caliza-divisor pt-3"
        >
          <input type="hidden" name="usuarioId" value={usuarioId} />
          <CasillaDeBaja nombre={nombre} />
          <Boton type="submit" variante="peligro">
            Dar de baja
            <span className="sr-only">{` a ${nombre}`}</span>
          </Boton>
        </form>
      ) : null}
    </div>
  );
}

/** S12: la casilla nombra a quien se da de baja; por que el servidor la vuelve a exigir, en la nota de `darDeBajaUsuarioAction` de AGENTS.md. */
function CasillaDeBaja({ nombre }: { nombre: string }) {
  return (
    <label className="flex min-h-11 max-w-full items-center gap-2.5 text-[13px] leading-[1.4] text-caliza-tinta">
      <input
        type="checkbox"
        name="confirmar"
        value="si"
        required
        className={`size-5 shrink-0 accent-senial-error ${ANILLO_DE_FOCO}`}
      />
      <span>{`Confirmo dar de baja a ${nombre}.`}</span>
    </label>
  );
}
