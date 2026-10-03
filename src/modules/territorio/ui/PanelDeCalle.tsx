import { AvisoDePermiso } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { LugarId } from "../domain";
import { AccionesDeCalle, esAccionDeCalle } from "./AccionesDeCalle";
import { rutaDe } from "./contenido";
import { FormulariosDeCalle } from "./FormulariosDeCalle";
import type { AccionDeNodo } from "./PanelDeNodo";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import type { CalleParaPanel } from "./vistaDeCalles";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  calle: CalleParaPanel;
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  accion: AccionDeNodo | undefined;
  permisos: PermisosDeTerritorio;
};

export function PanelDeCalle({
  raizId,
  nodoId,
  calle,
  lugares,
  accion,
  permisos,
}: Props) {
  const accionAbierta =
    esAccionDeCalle(accion) && puedeAbrir(accion, permisos)
      ? accion
      : undefined;
  const puedeAdministrar = puedeAbrir("ubicarCalle", permisos);
  const volver = rutaDe({
    raizId,
    nodoId,
    vista: "calles",
  });

  return (
    <section className="flex flex-col gap-4 rounded-md border border-caliza-divisor bg-caliza-superficie p-4">
      <div>
        <h3 className="text-[19px] font-semibold text-caliza-tinta">
          {calle.nombre}
        </h3>
        <p className="font-mono text-[14px] tabular-nums text-caliza-apagada">
          {calle.punto
            ? `${calle.punto.latitud}, ${calle.punto.longitud}`
            : "sin punto"}
        </p>
      </div>
      {puedeAdministrar ? (
        <details open={Boolean(accionAbierta)}>
          <summary className="cursor-pointer text-[15px] font-medium text-caliza-tinta">
            Acciones de calle
          </summary>
          <div className="flex flex-col gap-4 pt-4">
            <AccionesDeCalle
              raizId={raizId}
              nodoId={nodoId}
              calleId={calle.id}
              permisos={permisos}
              accionAbierta={accionAbierta}
            />
            <FormulariosDeCalle
              raizId={raizId}
              nodoId={nodoId}
              calle={calle}
              lugares={lugares}
              accionAbierta={accionAbierta}
              volver={volver}
            />
          </div>
        </details>
      ) : (
        <AvisoDePermiso
          capacidad="administrar la estructura territorial"
          requisito="el rol de administrador municipal"
        />
      )}
    </section>
  );
}
