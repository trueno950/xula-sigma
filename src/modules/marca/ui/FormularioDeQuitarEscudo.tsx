import { Trash } from "@phosphor-icons/react/ssr";
import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import { quitarEscudoAction } from "./actions/quitarEscudoAction";

/**
 * «Quitar escudo» (S7): su propio `<form>` nativo, adentro de la fila del
 * escudo.
 *
 * La casilla es la unica confirmacion que existe sin JavaScript —no hay
 * dialogo que pregunte antes— y el servidor la vuelve a exigir
 * (`quitarEscudoAction`): sin ella no se escribe la fila ni se borra el
 * objeto guardado. Misma forma que la baja de usuarios y el restablecimiento
 * de colores, y por eso el `name` y el `value` de la casilla son el contrato
 * con la accion y viven en un solo lugar.
 *
 * El boton va en `peligro` y no en marca: es irreversible y no es la accion
 * que la seccion existe para hacer (`estilos.ts`, `POR_VARIANTE`).
 */
export function FormularioDeQuitarEscudo({ nombre }: { nombre: string }) {
  return (
    <form action={quitarEscudoAction} className="flex flex-col gap-4">
      <input type="hidden" name="ambito" value="escudo" />
      <label className="flex min-h-11 max-w-full items-start gap-2.5 text-[15px] leading-[1.4] text-caliza-tinta">
        <input
          type="checkbox"
          name="confirmar"
          value="si"
          required
          className={`mt-0.5 size-5 shrink-0 accent-senial-error ${ANILLO_DE_FOCO}`}
        />
        <span>
          Confirmo quitar el escudo de {nombre}; la banda del municipio queda
          solo con el nombre.
        </span>
      </label>
      <BarraDeAcciones>
        <Boton type="submit" variante="peligro">
          <Trash size={18} aria-hidden="true" />
          Quitar escudo
        </Boton>
        <p className="self-center text-[13px] leading-[1.4] text-caliza-apagada">
          Sin la casilla no cambia nada: el servidor también la exige.
        </p>
      </BarraDeAcciones>
    </form>
  );
}
