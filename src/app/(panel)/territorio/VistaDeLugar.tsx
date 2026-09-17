import {
  type AccionDeNodo,
  type CalleId,
  ContenidoDeLugar,
  type DomicilioId,
  type NodoSeleccionado,
  PanelDeNodo,
  type PasoDeMigaja,
  type TabDeLugar,
} from "@/modules/territorio";
import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "@/modules/territorio/application/puertos";
import type {
  DomicilioGuardado,
  DomicilioParaListado,
} from "@/modules/territorio/application/puertosDeDomicilios";
import { cuentasDeLugar } from "@/modules/territorio/ui/contenido";
import type { PermisosDeTerritorio } from "@/modules/territorio/ui/permisos";

type Props = {
  raiz: Pick<LugarGuardado, "id" | "tipo" | "nombre">;
  nodos: readonly NodoDeSubarbol[];
  domicilios: readonly DomicilioParaListado[];
  nodo: NodoSeleccionado;
  calles: readonly Pick<CalleGuardada, "id" | "nombre" | "lugarId" | "punto">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  vista: TabDeLugar;
  accion: AccionDeNodo | undefined;
  calleId: CalleId | undefined;
  domicilioId: DomicilioId | undefined;
  domicilio: DomicilioGuardado | undefined;
  permisos: PermisosDeTerritorio;
};

/**
 * La migaja de direccion del lugar: Tepakan > Colonia Centro > [lugar].
 * Cada paso previo es un link a ese nodo, para subir en la jerarquia.
 */
const migajaDe = (
  raiz: Pick<LugarGuardado, "id" | "nombre">,
  nodos: readonly NodoDeSubarbol[],
  nodo: NodoSeleccionado,
): PasoDeMigaja[] => {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const cadena: PasoDeMigaja[] = [{ id: nodo.id, nombre: nodo.nombre }];
  let actual: NodoDeSubarbol | undefined =
    nodo.id === raiz.id ? undefined : porId.get(nodo.id);

  while (actual && actual.clase === "lugar" && actual.padreId) {
    const padre = porId.get(actual.padreId);
    if (padre?.clase !== "lugar") break;
    cadena.unshift({ id: padre.id, nombre: padre.nombre });
    actual = padre;
  }

  if (nodo.id !== raiz.id) cadena.unshift({ id: raiz.id, nombre: raiz.nombre });

  return cadena;
};

/**
 * La vista con `?raiz=` fijada: el panel del lugar (migaja + pestanas) y
 * el contenido de la pestana activa, una categoria a la vez. Navegar es
 * entrar: cada hijo fija `?nodo=`; la migaja sube de nivel. Vive aparte
 * de la pagina para que ninguna pase las 200 lineas de la metrica.
 */
export function VistaDeLugar({
  raiz,
  nodos,
  domicilios,
  nodo,
  calles,
  lugares,
  vista,
  accion,
  calleId,
  domicilioId,
  domicilio,
  permisos,
}: Props) {
  return (
    <>
      <PanelDeNodo
        raizId={raiz.id}
        nodo={nodo}
        migaja={migajaDe(raiz, nodos, nodo)}
        vista={vista}
        cuentas={cuentasDeLugar({ nodos, domicilios, calles, nodo })}
        abreLaEdicion={permisos.abreLaEdicion}
      />

      <ContenidoDeLugar
        raizId={raiz.id}
        lugar={nodo}
        nodos={nodos}
        calles={calles}
        lugares={lugares}
        domicilios={domicilios}
        calleId={calleId}
        domicilioId={domicilioId}
        domicilio={domicilio}
        vista={vista}
        accion={accion}
        permisos={permisos}
      />
    </>
  );
}
