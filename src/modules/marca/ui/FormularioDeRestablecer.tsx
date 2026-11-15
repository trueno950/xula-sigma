import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { CLASES_DE_FORMULARIO } from "@/shared/ui/estilos";
import { restablecerColoresAction } from "./actions/restablecerColoresAction";

/**
 * «Restablecer colores» (S5).
 *
 * Formulario propio y no un boton dentro del alta de colores, por la misma
 * razon que cada accion de fila del panel: restablecer no manda ningun
 * campo del alta, y sin JavaScript sigue siendo un POST entero en vez de
 * una parte de otro.
 */
export function FormularioDeRestablecer() {
  return (
    <form action={restablecerColoresAction} className={CLASES_DE_FORMULARIO}>
      <input type="hidden" name="ambito" value="colores" />
      <p className="text-[15px] text-caliza-apagada">
        Vuelve al rojo institucional de XULA y a su acento por defecto. El
        escudo del ayuntamiento no se toca.
      </p>
      <BarraDeAcciones>
        <Boton type="submit" variante="secundaria">
          Restablecer colores
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
