import { PencilSimple, Prohibit } from "@phosphor-icons/react/ssr";
import { ItemDeAccion } from "@/shared/ui";
import type { CalleGuardada } from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { LugarId } from "../domain";
import { FormularioDeBajaDeDomicilio } from "./FormularioDeBajaDeDomicilio";
import { FormularioDeCorreccionDeDomicilio } from "./FormularioDeCorreccionDeDomicilio";
import { opcionesDeCalles } from "./opciones";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import type { NivelDelFormulario } from "./vistaDeDomicilios";

export type AccionDeDomicilio = "corregirDomicilio" | "bajaDomicilio";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  domicilio: DomicilioGuardado;
  direccion: string;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
  zona: NivelDelFormulario;
  permisos: PermisosDeTerritorio;
  accionAbierta: AccionDeDomicilio | undefined;
};

/**
 * Corregir y dar de baja como detalles exclusivos, cerrados por defecto:
 * la baja va al final y separada, con el boton `peligro` dentro, para que
 * no se confunda con la accion de todos los dias.
 */
export function AccionesDeDomicilio({
  raizId,
  nodoId,
  domicilio,
  direccion,
  calles,
  zona,
  permisos,
  accionAbierta,
}: Props) {
  const puedeCorregir = puedeAbrir("corregirDomicilio", permisos);
  const puedeDarDeBaja = puedeAbrir("bajaDomicilio", permisos);
  if (!puedeCorregir && !puedeDarDeBaja) return null;

  return (
    <div className="flex flex-col gap-1">
      {puedeCorregir ? (
        <ItemDeAccion
          grupo="acciones-de-domicilio"
          etiqueta="Corregir"
          Icono={PencilSimple}
          abierto={accionAbierta === "corregirDomicilio"}
        >
          <FormularioDeCorreccionDeDomicilio
            raiz={raizId}
            nodo={nodoId}
            domicilio={domicilio}
            calles={opcionesDeCalles(calles)}
            zona={zona}
          />
        </ItemDeAccion>
      ) : null}
      {puedeDarDeBaja ? (
        <div className="mt-2 border-t border-caliza-divisor pt-2">
          <ItemDeAccion
            grupo="acciones-de-domicilio"
            etiqueta="Dar de baja"
            Icono={Prohibit}
            abierto={accionAbierta === "bajaDomicilio"}
            destructiva
          >
            <FormularioDeBajaDeDomicilio
              raiz={raizId}
              nodo={nodoId}
              domicilio={domicilio.id}
              direccion={direccion}
            />
          </ItemDeAccion>
        </div>
      ) : null}
    </div>
  );
}
