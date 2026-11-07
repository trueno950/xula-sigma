import { PencilSimple, Prohibit } from "@phosphor-icons/react/ssr";
import { EnlaceDeItemDeAccion, ItemDeAccion } from "@/shared/ui";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { ResidenteDeDomicilio } from "../application/puertosDeResidencias";
import type { LugarId } from "../domain";
import { rutaDe } from "./contenido";
import { FormularioDeBajaDeDomicilio } from "./FormularioDeBajaDeDomicilio";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import { ANCLA_DE_CORRECCION } from "./vistaDeCorreccion";

export type AccionDeDomicilio = "corregirDomicilio" | "bajaDomicilio";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  domicilio: DomicilioGuardado;
  direccion: string;
  permisos: PermisosDeTerritorio;
  accionAbierta: AccionDeDomicilio | undefined;
  /** `null`: la lectura fallo; ver `FormularioDeBajaDeDomicilio`. */
  residentes: readonly ResidenteDeDomicilio[] | null;
};

/**
 * Corregir navega a su propia vista, a lo ancho de la pestana
 * (`CorreccionDeDomicilio`). La baja es un detalle cerrado por defecto, al
 * final y separada, con el boton `peligro` dentro, para que no se confunda
 * con la accion de todos los dias.
 */
export function AccionesDeDomicilio({
  raizId,
  nodoId,
  domicilio,
  direccion,
  permisos,
  accionAbierta,
  residentes,
}: Props) {
  const puedeCorregir = puedeAbrir("corregirDomicilio", permisos);
  const puedeDarDeBaja = puedeAbrir("bajaDomicilio", permisos);
  if (!puedeCorregir && !puedeDarDeBaja) return null;

  return (
    <div className="flex flex-col gap-1">
      {puedeCorregir ? (
        <EnlaceDeItemDeAccion
          etiqueta="Corregir"
          Icono={PencilSimple}
          href={`${rutaDe({
            raizId,
            nodoId,
            vista: "domicilios",
            accion: "corregirDomicilio",
            domicilioId: domicilio.id,
          })}#${ANCLA_DE_CORRECCION}`}
        />
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
              residentes={residentes}
            />
          </ItemDeAccion>
        </div>
      ) : null}
    </div>
  );
}
