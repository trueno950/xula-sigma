import { InsigniaDeEstado } from "@/shared/ui";
import type { PuntoGeografico } from "../domain";
import { estadoDeUbicacion } from "./vistaDeCalles";

/** Ubicada en exito, Sin ubicar en aviso: igual en la tabla y en el panel. */
export function InsigniaDeUbicacion({
  punto,
}: {
  punto: PuntoGeografico | null;
}) {
  return (
    <InsigniaDeEstado
      tono={punto ? "exito" : "aviso"}
      etiqueta={estadoDeUbicacion(punto)}
    />
  );
}
