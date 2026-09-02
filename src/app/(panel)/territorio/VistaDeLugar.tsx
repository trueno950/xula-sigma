import {
  type AccionDeNodo,
  ContenidoDeLugar,
  type CuentasDeLugar,
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
import type { DomicilioParaListado } from "@/modules/territorio/application/puertosDeDomicilios";

type Props = {
  raiz: Pick<LugarGuardado, "id" | "tipo" | "nombre">;
  nodos: readonly NodoDeSubarbol[];
  domicilios: readonly DomicilioParaListado[];
  nodo: NodoSeleccionado;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  vista: TabDeLugar;
  accion: AccionDeNodo | undefined;
  puedeActuar: boolean;
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
 * Lo que cada pestana va a mostrar, contado una vez para escribirlo en la
 * pestana misma. Se cuenta aca —y no adentro de cada pestana— porque las
 * cuatro tienen que verse a la vez en la cabecera, y una pestana solo sabe
 * de lo suyo.
 */
const cuentasDe = ({
  nodos,
  domicilios,
  calles,
  nodo,
}: {
  nodos: readonly NodoDeSubarbol[];
  domicilios: readonly DomicilioParaListado[];
  calles: readonly Pick<CalleGuardada, "id">[];
  nodo: NodoSeleccionado;
}): CuentasDeLugar => {
  const idsDeDomicilios = new Set(
    nodos
      .filter((n) => n.clase === "domicilio" && n.lugarId === nodo.id)
      .map((n) => n.id),
  );

  return {
    lugares: nodos.filter((n) => n.clase === "lugar" && n.padreId === nodo.id)
      .length,
    calles: calles.length,
    domicilios: domicilios.filter((d) => idsDeDomicilios.has(d.id)).length,
  };
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
  puedeActuar,
}: Props) {
  return (
    <>
      <PanelDeNodo
        raizId={raiz.id}
        nodo={nodo}
        migaja={migajaDe(raiz, nodos, nodo)}
        vista={vista}
        cuentas={cuentasDe({ nodos, domicilios, calles, nodo })}
        puedeActuar={puedeActuar}
      />

      <ContenidoDeLugar
        raizId={raiz.id}
        lugar={nodo}
        nodos={nodos}
        calles={calles}
        lugares={lugares}
        domicilios={domicilios}
        vista={vista}
        accion={accion}
        puedeActuar={puedeActuar}
      />
    </>
  );
}
