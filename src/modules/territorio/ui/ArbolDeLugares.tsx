import type { LugarGuardado, NodoDeSubarbol } from "../application/puertos";
import type { LugarId } from "../domain";

type Props = {
  /** La pagina ya resolvio `raiz` y `nodos` (`application/subarbol.ts`); este componente solo arma el arbol. */
  raiz: Pick<LugarGuardado, "id" | "tipo" | "nombre">;
  nodos: readonly NodoDeSubarbol[];
};

type NodoDeArbol = { id: LugarId; tipo: string; nombre: string };

function hijosDe(
  nodos: readonly NodoDeSubarbol[],
  padreId: LugarId,
): NodoDeArbol[] {
  return nodos.filter(
    (nodo): nodo is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
      nodo.clase === "lugar" && nodo.padreId === padreId,
  );
}

function domiciliosColgadosDe(
  nodos: readonly NodoDeSubarbol[],
  lugarId: LugarId,
): number {
  return nodos.filter(
    (nodo) => nodo.clase === "domicilio" && nodo.lugarId === lugarId,
  ).length;
}

type PropsDeRama = {
  lugar: NodoDeArbol;
  nodos: readonly NodoDeSubarbol[];
};

/**
 * Una rama del arbol, recursiva sobre si misma. La profundidad esta
 * acotada en 4 por construccion (design.md seccion 7, punto 3), asi que
 * la recursion no necesita cinturon propio.
 */
function RamaDeLugar({ lugar, nodos }: PropsDeRama) {
  const hijos = hijosDe(nodos, lugar.id);
  const domicilios = domiciliosColgadosDe(nodos, lugar.id);
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
    return <li className="py-1 pl-4">{etiqueta}</li>;
  }

  return (
    <li className="py-1">
      <details className="pl-2">
        <summary className="cursor-pointer">{etiqueta}</summary>
        <ul className="ml-4 border-l border-caliza-divisor pl-2">
          {hijos.map((hijo) => (
            <RamaDeLugar key={hijo.id} lugar={hijo} nodos={nodos} />
          ))}
        </ul>
      </details>
    </li>
  );
}

/**
 * `<details>`/`<summary>` nativo, cero `"use client"` (tasks.md 3.20): el
 * despliegue de cada rama es HTML puro, sin JS que lo sostenga.
 */
export function ArbolDeLugares({ raiz, nodos }: Props) {
  const hijosDeRaiz = hijosDe(nodos, raiz.id);
  const domiciliosDeRaiz = domiciliosColgadosDe(nodos, raiz.id);

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
          {hijosDeRaiz.map((hijo) => (
            <RamaDeLugar key={hijo.id} lugar={hijo} nodos={nodos} />
          ))}
        </ul>
      ) : (
        <p className="pl-4 text-[14px] text-caliza-apagada">
          Sin lugares debajo.
        </p>
      )}
    </details>
  );
}
