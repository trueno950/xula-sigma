import { MOTIVOS_DE_CANCELACION } from "../domain";
import { cancelarConstanciaAction } from "./actions/cancelarConstanciaAction";

type Props = {
  constanciaId: string;
};

const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions). Quien decide si este componente se
 * monta es la pagina -`puedeAdministrarDocumentos(contexto.usuario.rol)`,
 * design.md de `constancias-oficios` decision 8-, no este archivo: ocultar
 * un boton no es autorizacion, la autorizacion real vive en
 * `cancelarConstancia`.
 */
export function BotonDeCancelacion({ constanciaId }: Props) {
  return (
    <form action={cancelarConstanciaAction} className="flex items-end gap-2">
      <input type="hidden" name="constanciaId" value={constanciaId} />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-caliza-apagada">
          Motivo de cancelacion
        </span>
        <select name="motivo" className={CLASE_CAMPO} defaultValue="">
          <option value="" disabled>
            Seleccione un motivo
          </option>
          {MOTIVOS_DE_CANCELACION.map((motivo) => (
            <option key={motivo} value={motivo}>
              {motivo}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm border border-senial-error px-4 text-[15px] font-medium text-senial-error"
      >
        Cancelar constancia
      </button>
    </form>
  );
}
