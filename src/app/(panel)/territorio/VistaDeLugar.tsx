import {
  type AccionDeNodo,
  type CalleId,
  ContenidoDeLugar,
  type DomicilioId,
  type NodoSeleccionado,
  PanelDeNodo,
  type TabDeLugar,
} from "@/modules/territorio";
import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "@/modules/territorio/application/puertos";
import type { DomicilioGuardado } from "@/modules/territorio/application/puertosDeDomicilios";
import { cuentasDeLugar } from "@/modules/territorio/ui/contenido";
import { opcionesDeCalles } from "@/modules/territorio/ui/opciones";
import {
  type PermisosDeTerritorio,
  puedeAbrir,
} from "@/modules/territorio/ui/permisos";
import {
  lugaresDeNodos,
  zonaDelFormulario,
} from "@/modules/territorio/ui/vistaDeDomicilios";
import { EnlaceDeAccion } from "@/shared/ui";
import { RegistroDeDomicilio } from "./RegistroDeDomicilio";

type Props = {
  raiz: Pick<LugarGuardado, "id" | "tipo" | "nombre">;
  nodos: readonly NodoDeSubarbol[];
  nodo: NodoSeleccionado;
  calles: readonly Pick<CalleGuardada, "id" | "nombre" | "lugarId" | "punto">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  vista: TabDeLugar;
  accion: AccionDeNodo | undefined;
  calleId: CalleId | undefined;
  domicilioId: DomicilioId | undefined;
  domicilio: DomicilioGuardado | undefined;
  permisos: PermisosDeTerritorio;
  /** El alta de domicilio esta abierta en la pestana Domicilios. */
  domicilioAbierto: boolean;
};

/**
 * La vista con `?raiz=` fijada: las pestanas del lugar y
 * el contenido de la pestana activa, una categoria a la vez. Navegar es
 * entrar: cada hijo fija `?nodo=`; la migaja de la cabecera sube de nivel. Vive aparte
 * de la pagina para que ninguna pase las 200 lineas de la metrica.
 */
export function VistaDeLugar({
  raiz,
  nodos,
  nodo,
  calles,
  lugares,
  vista,
  accion,
  calleId,
  domicilioId,
  domicilio,
  permisos,
  domicilioAbierto,
}: Props) {
  const zona = zonaDelFormulario(
    lugaresDeNodos(nodos),
    { id: raiz.id, nombre: raiz.nombre },
    nodo,
  );
  const opciones = opcionesDeCalles(calles);
  return (
    <>
      <PanelDeNodo
        raizId={raiz.id}
        nodo={nodo}
        vista={vista}
        cuentas={cuentasDeLugar({ nodos, calles, nodo })}
        abreLaEdicion={permisos.abreLaEdicion}
      />

      <ContenidoDeLugar
        raizId={raiz.id}
        lugar={nodo}
        nodos={nodos}
        calles={calles}
        lugares={lugares}
        calleId={calleId}
        domicilioId={domicilioId}
        domicilio={domicilio}
        vista={vista}
        accion={accion}
        permisos={permisos}
      />

      {vista === "domicilios" && puedeAbrir("domicilio", permisos) ? (
        domicilioAbierto ? (
          <RegistroDeDomicilio
            calles={opciones}
            zona={zona}
            volverA={`/territorio?raiz=${raiz.id}&nodo=${nodo.id}&vista=domicilios`}
            raiz={raiz.id}
            nodo={nodo.id}
          />
        ) : calles.length > 0 ? (
          <EnlaceDeAccion
            href={`/territorio?raiz=${raiz.id}&nodo=${nodo.id}&vista=domicilios&accion=domicilio`}
            variante="primaria"
          >
            Registrar domicilio
          </EnlaceDeAccion>
        ) : null
      ) : null}
    </>
  );
}
