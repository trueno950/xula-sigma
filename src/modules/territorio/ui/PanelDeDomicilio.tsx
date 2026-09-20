import { EnlaceDeAccion } from "@/shared/ui";
import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { LugarId } from "../domain";
import { hermanosDeDireccion, rutaDe } from "./contenido";
import { DatosDeDomicilio } from "./DatosDeDomicilio";
import { FormularioDeBajaDeDomicilio } from "./FormularioDeBajaDeDomicilio";
import { FormularioDeCorreccionDeDomicilio } from "./FormularioDeCorreccionDeDomicilio";
import { HermanosDeDireccion } from "./HermanosDeDireccion";
import { opcionesDeCalles } from "./opciones";
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
): accion is "corregirDomicilio" | "bajaDomicilio" =>
  accion === "corregirDomicilio" || accion === "bajaDomicilio";

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
  const hermanos = hermanosDeDireccion(nodos, domicilio);
  const accionAbierta =
    esAccionDeDomicilio(accion) && puedeAbrir(accion, permisos)
      ? accion
      : undefined;
  const volver = rutaDe({
    raizId,
    nodoId,
    vista: "domicilios",
    domicilioId: domicilio.id,
  });
  const puedeCorregir =
    puedeAbrir("corregirDomicilio", permisos) && !accionAbierta;
  const puedeDarDeBaja =
    puedeAbrir("bajaDomicilio", permisos) && !accionAbierta;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-caliza-divisor bg-caliza-superficie p-4">
      <DatosDeDomicilio
        raizId={raizId}
        domicilio={domicilio}
        calles={calles}
        lugares={lugares}
        nodos={nodos}
      />

      {puedeCorregir ? (
        <EnlaceDeAccion
          href={rutaDe({
            raizId,
            nodoId,
            vista: "domicilios",
            domicilioId: domicilio.id,
            accion: "corregirDomicilio",
          })}
          variante="primaria"
        >
          Corregir
        </EnlaceDeAccion>
      ) : null}

      {puedeDarDeBaja ? (
        <details>
          <summary className="cursor-pointer text-[15px] font-medium text-caliza-tinta">
            Dar de baja
          </summary>
          <div className="flex flex-col gap-4 pt-4">
            <p className="text-[15px] text-caliza-apagada">
              Una direccion dada de baja deja de listarse, y no se puede asignar
              en una mudanza.
            </p>
            <EnlaceDeAccion
              href={rutaDe({
                raizId,
                nodoId,
                vista: "domicilios",
                domicilioId: domicilio.id,
                accion: "bajaDomicilio",
              })}
              variante="peligro"
            >
              Dar de baja
            </EnlaceDeAccion>
          </div>
        </details>
      ) : null}

      <HermanosDeDireccion raizId={raizId} hermanos={hermanos} />

      {accionAbierta === "corregirDomicilio" ? (
        <FormularioDeCorreccionDeDomicilio
          raiz={raizId}
          nodo={nodoId}
          domicilio={domicilio}
          calles={opcionesDeCalles(calles)}
          zona={zonaConInicial(
            lugaresDeNodos(nodos),
            asentamiento
              ? { id: raizId, nombre: asentamiento.nombre }
              : undefined,
            domicilio.lugarId,
          )}
        />
      ) : null}

      {accionAbierta === "bajaDomicilio" ? (
        <FormularioDeBajaDeDomicilio
          raiz={raizId}
          nodo={nodoId}
          domicilio={domicilio.id}
          direccion={direccionDe(calle, domicilio.numero)}
        />
      ) : null}

      {accionAbierta ? (
        <EnlaceDeAccion href={volver} variante="fantasma">
          Cancelar
        </EnlaceDeAccion>
      ) : null}
    </section>
  );
}
