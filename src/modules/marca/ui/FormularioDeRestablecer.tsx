import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import { restablecerColoresAction } from "./actions/restablecerColoresAction";

/**
 * «Restablecer colores» (S2): el **cuerpo** de la fila del mismo nombre —el
 * titulo lo pone el resumen (S5), por eso este formulario ya no trae su
 * `<section>` ni su `<h2>`—.
 *
 * Formulario propio y no un boton dentro del alta de colores, por la misma
 * razon que cada accion de fila del panel: restablecer no manda ningun campo
 * del alta, y sin JavaScript sigue siendo un POST entero en vez de una parte
 * de otro.
 *
 * Dice **que colores se pierden** y pide una casilla: sin JavaScript no hay
 * dialogo que pregunte antes, asi que la pregunta es la casilla y el servidor
 * la vuelve a exigir (`restablecerColoresAction`). El `name` y el `value` de
 * la casilla son el contrato con la accion, y por eso viven en un solo lugar.
 */
export function FormularioDeRestablecer() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-[15px] leading-[1.55] text-caliza-tinta">
        Se pierden el color primario y el color de acento que eligió el
        municipio: vuelve al rojo institucional de XULA y a su acento por
        defecto. El escudo del ayuntamiento no se toca.
      </p>
      <form action={restablecerColoresAction} className="flex flex-col gap-6">
        <input type="hidden" name="ambito" value="colores" />
        <label className="flex min-h-11 max-w-full items-start gap-2.5 text-[15px] leading-[1.4] text-caliza-tinta">
          <input
            type="checkbox"
            name="confirmar"
            value="si"
            required
            className={`mt-0.5 size-5 shrink-0 accent-senial-error ${ANILLO_DE_FOCO}`}
          />
          <span>
            Confirmo volver a los colores por defecto de XULA y perder los de
            arriba.
          </span>
        </label>
        <BarraDeAcciones>
          <Boton type="submit" variante="peligro">
            Restablecer colores
          </Boton>
          <p className="self-center text-[13px] leading-[1.4] text-caliza-apagada">
            Sin la casilla no cambia nada: el servidor también la exige.
          </p>
        </BarraDeAcciones>
      </form>
    </div>
  );
}
