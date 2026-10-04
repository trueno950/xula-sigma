import {
  ClockCounterClockwise,
  MapTrifold,
  X,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  AvisoDePermiso,
  CLASES_DE_DATO,
  CLASES_DE_ENLACE,
  CLASES_DE_TARJETA,
  EnlaceDeAccion,
  InsigniaDeEstado,
} from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { LugarId } from "../domain";
import { AccionesDeCalle, esAccionDeCalle } from "./AccionesDeCalle";
import { rutaDe } from "./contenido";
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

const ENLACE_DE_CONTEXTO = `inline-flex items-center gap-2 self-start rounded-sm text-[15px] ${CLASES_DE_ENLACE}`;

/**
 * El detalle de la calle elegida. Con `lg` se sienta junto a la tabla y se
 * pega a la ventana; debajo de 1024px queda tras la lista y la fila enlaza a
 * `#panel-de-calle` para que el panel entre a la vista sin JavaScript.
 *
 * `/mapa-operativo` no acepta una calle ni un lugar (solo tipo, estado y
 * area), por eso el enlace va sin parametros.
 */
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
  const volver = rutaDe({ raizId, nodoId, vista: "calles" });

  return (
    <section
      id="panel-de-calle"
      aria-label={calle.nombre}
      className={`flex scroll-mt-4 flex-col gap-4 ${CLASES_DE_TARJETA} lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="break-words text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
            {calle.nombre}
          </h3>
          {calle.punto ? (
            <p className={CLASES_DE_DATO}>
              {calle.punto.latitud.toFixed(6)},{" "}
              {calle.punto.longitud.toFixed(6)}
            </p>
          ) : (
            <span className="self-start">
              <InsigniaDeEstado tono="aviso" etiqueta="Sin punto" />
            </span>
          )}
        </div>
        <EnlaceDeAccion href={volver} variante="fantasma">
          <X size={16} weight="bold" aria-hidden="true" />
          Cerrar
        </EnlaceDeAccion>
      </div>

      {puedeAbrir("ubicarCalle", permisos) ? (
        <AccionesDeCalle
          datos={{ raizId, nodoId, calle, lugares }}
          permisos={permisos}
          accionAbierta={accionAbierta}
        />
      ) : (
        <AvisoDePermiso
          capacidad="administrar la estructura territorial"
          requisito="el rol de administrador municipal"
        />
      )}

      <nav
        aria-label="Más sobre la calle"
        className="flex flex-col gap-2 border-t border-caliza-divisor pt-4"
      >
        <Link
          href={`/calles/${calle.id}/historial`}
          className={ENLACE_DE_CONTEXTO}
        >
          <ClockCounterClockwise size={18} aria-hidden="true" />
          Ver historial de la calle
        </Link>
        <Link href="/mapa-operativo" className={ENLACE_DE_CONTEXTO}>
          <MapTrifold size={18} aria-hidden="true" />
          Ver en el mapa operativo
        </Link>
      </nav>
    </section>
  );
}
