import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { ANILLO_DE_FOCO, CLASES_DE_FORMULARIO } from "@/shared/ui/estilos";
import { restablecerColoresAction } from "./actions/restablecerColoresAction";

/**
 * «Restablecer colores» (S2).
 *
 * Formulario propio y no un boton dentro del alta de colores, por la misma
 * razon que cada accion de fila del panel: restablecer no manda ningun campo
 * del alta, y sin JavaScript sigue siendo un POST entero en vez de una parte
 * de otro.
 *
 * Es una seccion con titulo, dice **que colores se pierden** y pide una
 * casilla: sin JavaScript no hay dialogo que pregunte antes, asi que la
 * pregunta es la casilla y el servidor la vuelve a exigir
 * (`restablecerColoresAction`). El `name` y el `value` de la casilla son el
 * contrato con la accion, y por eso viven en un solo lugar.
 *
 * El diseno completo de la pantalla —titulos de las tres secciones, muestra
 * en el celular— viene despues, en T4.
 */
export function FormularioDeRestablecer() {
  return (
    <section className={CLASES_DE_FORMULARIO}>
      <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
        Restablecer colores
      </h2>
      <p className="text-[15px] text-caliza-apagada">
        Se pierden el color primario y el color de acento que eligió el
        municipio: vuelve al rojo institucional de XULA y a su acento por
        defecto. El escudo del ayuntamiento no se toca.
      </p>
      <form action={restablecerColoresAction} className="flex flex-col gap-6">
        <input type="hidden" name="ambito" value="colores" />
        <label className="flex min-h-11 max-w-full items-center gap-2.5 text-[13px] leading-[1.4] text-caliza-tinta">
          <input
            type="checkbox"
            name="confirmar"
            value="si"
            required
            className={`size-5 shrink-0 accent-senial-error ${ANILLO_DE_FOCO}`}
          />
          <span>
            Confirmo que quiero volver a los colores por defecto de XULA.
          </span>
        </label>
        <BarraDeAcciones>
          <Boton type="submit" variante="secundaria">
            Restablecer colores
          </Boton>
        </BarraDeAcciones>
      </form>
    </section>
  );
}
