import { ANILLO_DE_FOCO } from "@/shared/ui";

/**
 * La casilla que confirma una accion que deja a alguien afuera o lo devuelve
 * adentro: la baja y la reactivacion (S12 de `usuarios-ux` y S3).
 *
 * **Los dos atributos son el contrato, y por eso viven en un solo lugar.** El
 * `name="confirmar"` con `value="si"` es lo que las dos acciones leen en el
 * borde, y el `required` es la unica confirmacion que existe sin JavaScript:
 * no hay dialogo que pregunte antes, el formulario se envia igual y el
 * servidor vuelve a exigirlo. Una copia de esta casilla que se olvidara de
 * cualquiera de los dos dejaria pasar un clic solo.
 *
 * El texto nombra a la persona (S12): «Confirmo dar de baja a Rosa Poot.»
 * dice a quien alcanza el boton de arriba, que esta dentro de una fila y a
 * veces a un scroll de distancia.
 */
export function CasillaDeConfirmacion({
  nombre,
  accion,
}: {
  nombre: string;
  /** En infinitivo: «dar de baja», «reactivar». */
  accion: string;
}) {
  return (
    <label className="flex min-h-11 max-w-full items-center gap-2.5 text-[13px] leading-[1.4] text-caliza-tinta">
      <input
        type="checkbox"
        name="confirmar"
        value="si"
        required
        className={`size-5 shrink-0 accent-senial-error ${ANILLO_DE_FOCO}`}
      />
      <span>{`Confirmo ${accion} a ${nombre}.`}</span>
    </label>
  );
}
