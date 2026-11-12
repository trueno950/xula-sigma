import { X } from "@phosphor-icons/react/ssr";
import { CLASES_DE_TARJETA, EnlaceDeAccion } from "@/shared/ui";
import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { ResidenteDeDomicilio } from "../application/puertosDeResidencias";
import type { LugarId } from "../domain";
import {
  type AccionDeDomicilio,
  AccionesDeDomicilio,
} from "./AccionesDeDomicilio";
import {
  type DomicilioDeLaPestana,
  hermanosDeDireccion,
  rutaDe,
} from "./contenido";
import { DatosDeDomicilio } from "./DatosDeDomicilio";
import { HermanosDeDireccion } from "./HermanosDeDireccion";
import type { AccionDeNodo } from "./PanelDeNodo";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import { ResidentesDeDomicilio } from "./ResidentesDeDomicilio";
import { direccionDeDomicilio } from "./vistaDeCorreccion";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  domicilio: DomicilioGuardado;
  calles: readonly Pick<CalleGuardada, "id" | "nombre" | "lugarId" | "punto">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  nodos: readonly NodoDeSubarbol[];
  accion: AccionDeNodo | undefined;
  permisos: PermisosDeTerritorio;
  /** `null`: no se pudieron leer; ver `ResidentesDeDomicilio`. */
  residentes: readonly ResidenteDeDomicilio[] | null;
  /** Los vivos con su calle y su numero, leidos en el subarbol del asentamiento. */
  mismaDireccion: readonly DomicilioDeLaPestana[];
  /** La ficha desde la que se entro; ver `contenido.ts` (`PropsDeContenido`). */
  regreso?: string | undefined;
};

const esAccionDeDomicilio = (
  accion: AccionDeNodo | undefined,
): accion is AccionDeDomicilio =>
  accion === "corregirDomicilio" || accion === "bajaDomicilio";

/**
 * El detalle del domicilio elegido. Con `lg` se sienta en la segunda
 * columna, junto a la tabla, y se pega a la ventana; debajo de 1024px va
 * antes de la lista y la fila enlaza a `#panel-de-domicilio` para que entre
 * a la vista sin JavaScript.
 */
export function PanelDeDomicilio({
  raizId,
  nodoId,
  domicilio,
  calles,
  lugares,
  nodos,
  accion,
  permisos,
  residentes,
  mismaDireccion,
  regreso,
}: Props) {
  const direccion = direccionDeDomicilio(domicilio, calles);
  const accionAbierta =
    esAccionDeDomicilio(accion) && puedeAbrir(accion, permisos)
      ? accion
      : undefined;

  return (
    <section
      id="panel-de-domicilio"
      aria-label={direccion}
      className={`flex scroll-mt-4 flex-col gap-4 ${CLASES_DE_TARJETA} lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto`}
    >
      <div className="flex items-start justify-between gap-2">
        <DatosDeDomicilio
          raizId={raizId}
          domicilio={domicilio}
          calles={calles}
          lugares={lugares}
          nodos={nodos}
        />
        <EnlaceDeAccion
          href={rutaDe({ raizId, nodoId, vista: "domicilios", regreso })}
          variante="fantasma"
        >
          <X size={16} weight="bold" aria-hidden="true" />
          Cerrar
        </EnlaceDeAccion>
      </div>

      <ResidentesDeDomicilio residentes={residentes} />

      <AccionesDeDomicilio
        raizId={raizId}
        nodoId={nodoId}
        domicilio={domicilio}
        direccion={direccion}
        permisos={permisos}
        accionAbierta={accionAbierta}
        residentes={residentes}
        regreso={regreso}
      />

      <HermanosDeDireccion
        raizId={raizId}
        hermanos={hermanosDeDireccion(mismaDireccion, domicilio)}
        regreso={regreso}
      />
    </section>
  );
}
