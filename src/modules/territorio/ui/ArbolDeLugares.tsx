import type { LugarGuardado, NodoDeSubarbol } from "../application/puertos";
import type { LugarId } from "../domain";

type Props = {
  /** La pagina ya resolvio `raiz` y `nodos` (`application/subarbol.ts`); este componente solo arma el arbol. */
  raiz: Pick<LugarGuardado, "id" | "tipo" | "nombre">;
  nodos: readonly NodoDeSubarbol[];
};

type NodoDeArbol = { id: LugarId; tipo: string; nombre: string };

/**
 * `<details>`/`<summary>` nativo, cero `"use client"` (tasks.md 3.20): el
 * despliegue de cada rama es HTML puro, sin JS que lo sostenga. La
 * profundidad esta acotada en 4 por construccion (design.md seccion 7,
 * punto 3), asi que la recursion no necesita cinturon propio.
 */
export function ArbolDeLugares({ raiz, nodos }: Props) {
  const hijosDe = (padreId: LugarId): NodoDeArbol[] =>
    nodos.filter(
      (nodo): nodo is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
        nodo.clase === "lugar" && nodo.padreId === padreId,
    );

  const domiciliosColgadosDe = (lugarId: LugarId): number =>
    nodos.filter(
      (nodo) => nodo.clase === "domicilio" && nodo.lugarId === lugarId,
    ).length;

  const renderRama = (lugar: NodoDeArbol) => {
    const hijos = hijosDe(lugar.id);
    const domicilios = domiciliosColgadosDe(lugar.id);
    const etiqueta = (
      <span className="text-[15px] text-caliza-tinta">
        {lugar.nombre}{" "}
        <span className="text-[13px] text-caliza-apagada">({lugar.tipo})</span>
        {domicilios > 0 ? (
          <span className="ml-2 text-[13px] text-caliza-apagada">
            {domicilios} domicilio{domicilios === 1 ? "" : "s"}
          </span>
        ) : null}
      </span>
    );

    if (hijos.length === 0) {
      return (
        <li key={lugar.id} className="py-1 pl-4">
          {etiqueta}
        </li>
      );
    }

    return (
      <li key={lugar.id} className="py-1">
        <details className="pl-2">
          <summary className="cursor-pointer">{etiqueta}</summary>
          <ul className="ml-4 border-l border-caliza-divisor pl-2">
            {hijos.map(renderRama)}
          </ul>
        </details>
      </li>
    );
  };

  const hijosDeRaiz = hijosDe(raiz.id);
  const domiciliosDeRaiz = domiciliosColgadosDe(raiz.id);

  return (
    <details open className="text-[15px]">
      <summary className="cursor-pointer font-medium text-caliza-tinta">
        {raiz.nombre}
        {domiciliosDeRaiz > 0 ? (
          <span className="ml-2 text-[13px] font-normal text-caliza-apagada">
            {domiciliosDeRaiz} domicilio{domiciliosDeRaiz === 1 ? "" : "s"}
          </span>
        ) : null}
      </summary>
      {hijosDeRaiz.length > 0 ? (
        <ul className="ml-4 border-l border-caliza-divisor pl-2">
          {hijosDeRaiz.map(renderRama)}
        </ul>
      ) : (
        <p className="pl-4 text-[14px] text-caliza-apagada">
          Sin lugares debajo.
        </p>
      )}
    </details>
  );
}
