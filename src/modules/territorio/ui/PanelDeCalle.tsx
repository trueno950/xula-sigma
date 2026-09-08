import {
  ArrowsOutCardinal,
  MapPin,
  PencilSimple,
  Prohibit,
} from "@phosphor-icons/react/ssr";
import { EnlaceDeAccion } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { LugarId } from "../domain";
import { rutaDe } from "./contenido";
import { FormularioDeBajaDeCalle } from "./FormularioDeBajaDeCalle";
import { FormularioDeMovimientoDeCalle } from "./FormularioDeMovimientoDeCalle";
import { FormularioDeRenombreDeCalle } from "./FormularioDeRenombreDeCalle";
import { FormularioDeUbicacion } from "./FormularioDeUbicacion";
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

type AccionDeCalle = Extract<
  AccionDeNodo,
  "ubicarCalle" | "renombrarCalle" | "reparentearCalle" | "bajaCalle"
>;

type ParametrosDeHref = {
  raizId: LugarId;
  nodoId: LugarId;
  calleId: CalleParaPanel["id"];
  accion: AccionDeCalle;
};

const esAccionDeCalle = (
  accion: AccionDeNodo | undefined,
): accion is AccionDeCalle =>
  accion === "ubicarCalle" ||
  accion === "renombrarCalle" ||
  accion === "reparentearCalle" ||
  accion === "bajaCalle";

const hrefDe = ({ raizId, nodoId, calleId, accion }: ParametrosDeHref) =>
  rutaDe({
    raizId,
    nodoId,
    vista: "calles",
    calleId,
    accion,
  });

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
            : "Sin punto"}
        </p>
      </div>
      <details open={Boolean(accionAbierta)}>
        <summary className="cursor-pointer text-[15px] font-medium text-caliza-tinta">
          Acciones de calle
        </summary>
        <div className="flex flex-col gap-4 pt-4">
          {puedeAbrir("ubicarCalle", permisos) ? (
            <EnlaceDeAccion
              href={hrefDe({
                raizId,
                nodoId,
                calleId: calle.id,
                accion: "ubicarCalle",
              })}
              variante="primaria"
            >
              <MapPin size={18} aria-hidden="true" />
              Ubicar en el mapa
            </EnlaceDeAccion>
          ) : null}
          {puedeAbrir("renombrarCalle", permisos) ? (
            <EnlaceDeAccion
              href={hrefDe({
                raizId,
                nodoId,
                calleId: calle.id,
                accion: "renombrarCalle",
              })}
            >
              <PencilSimple size={18} aria-hidden="true" />
              Renombrar
            </EnlaceDeAccion>
          ) : null}
          {puedeAbrir("reparentearCalle", permisos) ? (
            <EnlaceDeAccion
              href={hrefDe({
                raizId,
                nodoId,
                calleId: calle.id,
                accion: "reparentearCalle",
              })}
            >
              <ArrowsOutCardinal size={18} aria-hidden="true" />
              Mover a otro lugar
            </EnlaceDeAccion>
          ) : null}
          {puedeAbrir("bajaCalle", permisos) ? (
            <EnlaceDeAccion
              href={hrefDe({
                raizId,
                nodoId,
                calleId: calle.id,
                accion: "bajaCalle",
              })}
              variante="peligro"
            >
              <Prohibit size={18} aria-hidden="true" />
              Dar de baja
            </EnlaceDeAccion>
          ) : null}
          {accionAbierta === "ubicarCalle" ? (
            <FormularioDeUbicacion calle={calle} />
          ) : null}
          {accionAbierta === "renombrarCalle" ? (
            <FormularioDeRenombreDeCalle
              raiz={raizId}
              nodo={nodoId}
              calle={calle}
            />
          ) : null}
          {accionAbierta === "reparentearCalle" ? (
            <FormularioDeMovimientoDeCalle calle={calle} lugares={lugares} />
          ) : null}
          {accionAbierta === "bajaCalle" ? (
            <FormularioDeBajaDeCalle calle={calle} />
          ) : null}
          {accionAbierta ? (
            <EnlaceDeAccion href={volver} variante="fantasma">
              Cancelar
            </EnlaceDeAccion>
          ) : null}
        </div>
      </details>
    </section>
  );
}
