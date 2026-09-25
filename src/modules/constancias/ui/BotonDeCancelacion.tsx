import { Boton, CampoDeLista, opcionesEtiquetadas } from "@/shared/ui";
import {
  ETIQUETA_DE_MOTIVO_DE_CANCELACION,
  MOTIVOS_DE_CANCELACION,
} from "../domain";
import { cancelarConstanciaAction } from "./actions/cancelarConstanciaAction";

type Props = {
  constanciaId: string;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions). Quien decide si este componente se
 * monta es la pagina -`puedeAdministrarDocumentos(contexto.usuario.rol)`,
 * design.md de `constancias-oficios` decision 8-, no este archivo: ocultar
 * un boton no es autorizacion, la autorizacion real vive en
 * `cancelarConstancia`.
 *
 * Variante `peligro` y no la marca del municipio: cancelar un documento
 * emitido no se deshace, y en un ayuntamiento de marca roja el boton de
 * marca y el de cancelar se veian identicos (`DESIGN.md`, Don'ts).
 */
export function BotonDeCancelacion({ constanciaId }: Props) {
  return (
    <form action={cancelarConstanciaAction} className="flex flex-col gap-4">
      <input type="hidden" name="constanciaId" value={constanciaId} />
      <CampoDeLista
        id="motivo-de-cancelacion"
        name="motivo"
        etiqueta="Motivo de cancelacion"
        marcador="Seleccione un motivo"
        opciones={opcionesEtiquetadas(
          MOTIVOS_DE_CANCELACION,
          ETIQUETA_DE_MOTIVO_DE_CANCELACION,
        )}
        ayuda="No se deshace. El documento queda cancelado con este motivo."
      />
      <Boton type="submit" variante="peligro">
        Cancelar constancia
      </Boton>
    </form>
  );
}
