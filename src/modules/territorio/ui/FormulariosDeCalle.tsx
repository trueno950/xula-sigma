import { EnlaceDeAccion } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { LugarId } from "../domain";
import type { AccionDeCalle } from "./AccionesDeCalle";
import { FormularioDeBajaDeCalle } from "./FormularioDeBajaDeCalle";
import { FormularioDeMovimientoDeCalle } from "./FormularioDeMovimientoDeCalle";
import { FormularioDeRenombreDeCalle } from "./FormularioDeRenombreDeCalle";
import { FormularioDeUbicacion } from "./FormularioDeUbicacion";
import type { CalleParaPanel } from "./vistaDeCalles";

export function FormulariosDeCalle({
  raizId,
  nodoId,
  calle,
  lugares,
  accionAbierta,
  volver,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  calle: CalleParaPanel;
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  accionAbierta: AccionDeCalle | undefined;
  volver: string;
}) {
  return (
    <>
      {accionAbierta === "ubicarCalle" ? (
        <FormularioDeUbicacion raiz={raizId} nodo={nodoId} calle={calle} />
      ) : null}

      {accionAbierta === "renombrarCalle" ? (
        <FormularioDeRenombreDeCalle
          raiz={raizId}
          nodo={nodoId}
          calle={calle}
        />
      ) : null}

      {accionAbierta === "reparentearCalle" ? (
        <FormularioDeMovimientoDeCalle
          raiz={raizId}
          nodo={nodoId}
          calle={calle}
          lugares={lugares}
        />
      ) : null}

      {accionAbierta === "bajaCalle" ? (
        <FormularioDeBajaDeCalle raiz={raizId} nodo={nodoId} calle={calle} />
      ) : null}

      {accionAbierta ? (
        <EnlaceDeAccion href={volver} variante="fantasma">
          Cancelar
        </EnlaceDeAccion>
      ) : null}
    </>
  );
}
