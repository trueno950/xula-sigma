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
} from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { UsoDeCalle } from "../application/usoDeCalle";
import type { LugarId, PuntoGeografico } from "../domain";
import { AccionesDeCalle, esAccionDeCalle } from "./AccionesDeCalle";
import { rutaDe } from "./contenido";
import { InsigniaDeUbicacion } from "./InsigniaDeUbicacion";
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
  /** Donde abre el mapa si la calle no tiene punto; ver `centroDeCalles`. */
  centro?: PuntoGeografico | null | undefined;
  /** Lo que frena mover o dar de baja; ver `bloqueosDeCalle`. */
  uso?: UsoDeCalle | null | undefined;
  /** La ficha desde la que se entro; ver `contenido.ts` (`PropsDeContenido`). */
  regreso?: string | undefined;
};

const ENLACE_DE_CONTEXTO = `inline-flex items-center gap-2 self-start rounded-sm text-[15px] ${CLASES_DE_ENLACE}`;

/**
 * El detalle de la calle elegida. Con `lg` se sienta en la segunda columna,
 * junto a la tabla, y se pega a la ventana; debajo de 1024px va antes de la
 * lista y la fila enlaza a `#panel-de-calle` para que entre a la vista sin
 * JavaScript.
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
  centro,
  uso,
  regreso,
}: Props) {
  const accionAbierta =
    esAccionDeCalle(accion) && puedeAbrir(accion, permisos)
      ? accion
      : undefined;
  const volver = rutaDe({ raizId, nodoId, vista: "calles", regreso });

  return (
    <section
      id="panel-de-calle"
      aria-label={calle.nombre}
      className={`flex scroll-mt-4 flex-col gap-4 ${CLASES_DE_TARJETA} lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="break-words text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
            {calle.nombre}
          </h2>
          <span className="self-start">
            <InsigniaDeUbicacion punto={calle.punto} />
          </span>
          {calle.punto ? (
            <p className={CLASES_DE_DATO}>
              {calle.punto.latitud.toFixed(6)},{" "}
              {calle.punto.longitud.toFixed(6)}
            </p>
          ) : null}
        </div>
        <EnlaceDeAccion href={volver} variante="fantasma">
          <X size={16} weight="bold" aria-hidden="true" />
          Cerrar
        </EnlaceDeAccion>
      </div>

      {puedeAbrir("ubicarCalle", permisos) ? (
        <AccionesDeCalle
          datos={{ raizId, nodoId, calle, lugares, centro }}
          permisos={permisos}
          accionAbierta={accionAbierta}
          uso={uso}
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
