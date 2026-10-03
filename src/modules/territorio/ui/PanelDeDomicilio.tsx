import { X } from "@phosphor-icons/react/ssr";
import { CLASES_DE_TARJETA, EnlaceDeAccion } from "@/shared/ui";
import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { LugarId } from "../domain";
import {
  type AccionDeDomicilio,
  AccionesDeDomicilio,
} from "./AccionesDeDomicilio";
import { hermanosDeDireccion, rutaDe } from "./contenido";
import { DatosDeDomicilio } from "./DatosDeDomicilio";
import { HermanosDeDireccion } from "./HermanosDeDireccion";
import type { AccionDeNodo } from "./PanelDeNodo";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import {
  direccionDe,
  lugaresDeNodos,
  zonaConInicial,
} from "./vistaDeDomicilios";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  domicilio: DomicilioGuardado;
  calles: readonly Pick<CalleGuardada, "id" | "nombre" | "lugarId" | "punto">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  nodos: readonly NodoDeSubarbol[];
  accion: AccionDeNodo | undefined;
  permisos: PermisosDeTerritorio;
};

const esAccionDeDomicilio = (
  accion: AccionDeNodo | undefined,
): accion is AccionDeDomicilio =>
  accion === "corregirDomicilio" || accion === "bajaDomicilio";

/**
 * El detalle del domicilio elegido. Con `lg` se sienta junto a la tabla y
 * se pega a la ventana; debajo de 1024px queda tras la lista y la fila
 * enlaza a `#panel-de-domicilio` para que entre a la vista sin JavaScript.
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
}: Props) {
  const asentamiento = lugares.find((posible) => posible.id === raizId);
  const calle =
    calles.find((posible) => posible.id === domicilio.calleId)?.nombre ??
    "Calle desconocida";
  const direccion = direccionDe(calle, domicilio.numero);
  const accionAbierta =
    esAccionDeDomicilio(accion) && puedeAbrir(accion, permisos)
      ? accion
      : undefined;

  return (
    <section
      id="panel-de-domicilio"
      aria-label={direccion}
      className={`flex scroll-mt-4 flex-col gap-4 ${CLASES_DE_TARJETA} lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto`}
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
          href={rutaDe({ raizId, nodoId, vista: "domicilios" })}
          variante="fantasma"
        >
          <X size={16} weight="bold" aria-hidden="true" />
          Cerrar
        </EnlaceDeAccion>
      </div>

      <AccionesDeDomicilio
        raizId={raizId}
        nodoId={nodoId}
        domicilio={domicilio}
        direccion={direccion}
        calles={calles}
        zona={zonaConInicial(
          lugaresDeNodos(nodos),
          asentamiento
            ? { id: raizId, nombre: asentamiento.nombre }
            : undefined,
          domicilio.lugarId,
        )}
        permisos={permisos}
        accionAbierta={accionAbierta}
      />

      <HermanosDeDireccion
        raizId={raizId}
        hermanos={hermanosDeDireccion(nodos, domicilio)}
      />
    </section>
  );
}
