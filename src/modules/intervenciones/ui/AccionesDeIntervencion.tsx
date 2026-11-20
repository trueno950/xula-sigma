import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { ANILLO_DE_FOCO, Boton, CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import {
  ESTADOS_DE_INTERVENCION,
  type EstadoDeIntervencion,
  transicionValida,
} from "../domain";
import { cambiarEstadoAction } from "./actions/cambiarEstadoAction";
import { FormularioDeCorreccion } from "./FormularioDeCorreccion";
import { identificadorDeIntervencion } from "./identificadorDeIntervencion";

type Props = {
  intervencion: IntervencionGuardada;
};

const ETIQUETAS: Record<EstadoDeIntervencion, string> = {
  PLANIFICADA: "Marcar planificada",
  EN_EJECUCION: "Marcar en ejecución",
  FINALIZADA: "Marcar finalizada",
  CANCELADA: "Cancelar la intervención",
};

const MENSAJE_DE_TERMINAL = "El estado es terminal; no se puede reabrir.";

/**
 * El `name` compartido vuelve acordeon los dos pliegues del panel -abrir uno
 * cierra el otro-, sin estado de cliente. Es el mismo mecanismo que
 * `AccionesDeReporte`.
 */
const GRUPO = "acciones-de-intervencion";

const CLASES_DE_SUMMARY =
  "flex min-h-11 w-full cursor-pointer list-none items-center gap-2 rounded-md " +
  "border bg-caliza-lienzo px-3.5 py-2.5 text-left text-[15px] font-semibold " +
  "transition-colors duration-150 ease-salida [&::-webkit-details-marker]:hidden";

const enDesplegable = (
  contenido: ReactNode,
  etiqueta: string,
  peligro: boolean,
) => (
  <details name={GRUPO} className="group">
    <summary
      className={`${CLASES_DE_SUMMARY} ${ANILLO_DE_FOCO} ${
        peligro
          ? "border-senial-error text-senial-error hover:bg-senial-error-suave"
          : "border-caliza-borde text-caliza-tinta hover:bg-caliza-superficie"
      }`}
    >
      {etiqueta}
      <CaretDown
        size={18}
        weight="bold"
        aria-hidden="true"
        className="ml-auto shrink-0 transition-transform duration-150 group-open:rotate-180"
      />
    </summary>
    <div
      className={`mt-2 flex flex-col gap-4 rounded-md p-3.5 ${
        peligro ? "bg-senial-error-suave" : "bg-caliza-superficie"
      }`}
    >
      {contenido}
    </div>
  </details>
);

/** El avance de estado: una sola tecla, a todo el ancho del panel. */
function BotonDeTransicion({
  id,
  destino,
}: {
  id: string;
  destino: EstadoDeIntervencion;
}) {
  return (
    <form action={cambiarEstadoAction} className="[&>button]:w-full">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estadoNuevo" value={destino} />
      <Boton type="submit" variante="primaria">
        {ETIQUETAS[destino]}
      </Boton>
    </form>
  );
}

/**
 * La casilla de confirmacion de S12. Es `required` para que el navegador
 * frene el envio, y `cambiarEstadoAction` la vuelve a exigir: sin JavaScript
 * no hay dialogo que pregunte antes, y un POST a mano no puede saltearla.
 */
function ConfirmacionDeCancelacion({
  id,
  identificador,
}: {
  id: string;
  identificador: string;
}) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estadoNuevo" value="CANCELADA" />
      <p className="text-[15px] leading-[1.45] text-caliza-tinta">
        Una intervención cancelada no se puede reabrir. Si el trabajo sigue en
        pie, conviene corregirla, no cancelarla.
      </p>
      <label className="flex min-h-11 items-start gap-2.5 text-[15px] leading-[1.4] text-caliza-tinta">
        <input
          type="checkbox"
          name="confirmar"
          value="si"
          required
          className={`mt-0.5 size-5 shrink-0 accent-senial-error ${ANILLO_DE_FOCO}`}
        />
        <span>{`Confirmo cancelar la intervención ${identificador}.`}</span>
      </label>
      <Boton type="submit" variante="peligro">
        Cancelar la intervención
      </Boton>
    </>
  );
}

/**
 * El contenido del panel de acciones (S12 y S13 de `intervenciones-ux`): el
 * siguiente paso como unica primaria, «Corregir intervención…» plegado para
 * que no compita con el, y «Cancelar» al final, detras de un divisor, como
 * peligro y con confirmacion explicita.
 *
 * Visible solo si la pagina decidio que el rol administra: este componente no
 * se guarda a si mismo, mismo reparto que `AccionesDeReporte`. En un estado
 * terminal no hay transiciones -el texto lo dice- pero la correccion sigue
 * disponible: corregir no cambia el estado y no hay razon para quitarla.
 */
export function AccionesDeIntervencion({ intervencion }: Props) {
  const destinos = ESTADOS_DE_INTERVENCION.filter(
    (estado) =>
      estado !== "CANCELADA" && transicionValida(intervencion.estado, estado),
  );
  const [principal] = destinos;
  const puedeCancelar = transicionValida(intervencion.estado, "CANCELADA");
  const identificador = identificadorDeIntervencion(intervencion.id);

  return (
    <div className="flex flex-col gap-3">
      {principal ? (
        <div className="flex flex-col gap-1">
          <p className={CLASES_DE_ETIQUETA}>Siguiente paso</p>
          <BotonDeTransicion id={intervencion.id} destino={principal} />
        </div>
      ) : (
        <p className="text-[15px] text-caliza-apagada">{MENSAJE_DE_TERMINAL}</p>
      )}

      {enDesplegable(
        <FormularioDeCorreccion intervencion={intervencion} />,
        "Corregir intervención…",
        false,
      )}

      {puedeCancelar ? (
        <div className="mt-1 border-t border-caliza-divisor pt-4">
          {enDesplegable(
            <form action={cambiarEstadoAction} className="flex flex-col gap-3">
              <ConfirmacionDeCancelacion
                id={intervencion.id}
                identificador={identificador}
              />
            </form>,
            "Cancelar intervención…",
            true,
          )}
        </div>
      ) : null}
    </div>
  );
}
