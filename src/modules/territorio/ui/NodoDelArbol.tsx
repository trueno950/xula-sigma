import { CaretRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ANILLO_DE_FOCO, CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import type { LugarId } from "../domain";
import type { NodoDeArbol } from "./arbolDeLugares";
import {
  AlternadorDeRama,
  CLASE_DE_FILA,
  CLASE_DE_FILA_DE_RAMA,
  ContenidoDeFila,
  hrefDeLugar,
  sangriaDe,
} from "./FilaDeLugar";

type Props = {
  nodo: NodoDeArbol;
  cuentas: ReadonlyMap<LugarId, ConteoDeLugar>;
  /** Con busqueda, toda rama con coincidencia llega abierta. */
  abrirTodo: boolean;
};

const CLASE_DE_LISTA =
  "flex flex-col divide-y divide-caliza-divisor border-t border-caliza-divisor";

const CLASE_DEL_RESUMEN =
  "inline-flex min-h-12 cursor-pointer list-none items-center align-middle " +
  "transition-colors duration-150 ease-salida " +
  "hover:bg-caliza-superficie [&::-webkit-details-marker]:hidden " +
  "focus-visible:outline-solid focus-visible:-outline-offset-2 " +
  "focus-visible:outline-2 focus-visible:outline-marca";

/**
 * Un lugar del arbol. Con hijos es un `<details>` nativo -sin componente de
 * cliente-: abierto el primer nivel y cerrado lo de mas adentro.
 *
 * La fila -nombre, tipo y cuentas- va **fuera** del `<details>` de la rama:
 * cerrado, el navegador esconde todo lo que no sea el `<summary>`, y el
 * nombre quedaba invisible. El `<details>` queda `inline` para compartir la
 * linea con la fila, y envuelve solo el alternador y la lista de hijos, que
 * al abrir rompe la linea y ocupa el ancho completo. La navegacion sigue
 * siendo un enlace y el alternador un `<summary>` etiquetado: dos controles
 * hermanos, nunca uno adentro del otro.
 */
export function NodoDelArbol({ nodo, cuentas, abrirTodo }: Props) {
  const cuenta = cuentas.get(nodo.lugar.id);
  const sangria = sangriaDe(nodo.nivel);
  const conHijos = nodo.hijos.length > 0;

  return (
    <li className={conHijos ? `${sangria} pr-4` : undefined}>
      {conHijos ? (
        <>
          <span className={CLASE_DE_FILA_DE_RAMA}>
            <ContenidoDeFila nodo={nodo} cuenta={cuenta} />
          </span>
          <details open={abrirTodo || nodo.nivel === 0} className="inline">
            <summary
              aria-label={`Mostrar u ocultar el contenido de ${nodo.lugar.nombre}`}
              className={CLASE_DEL_RESUMEN}
            >
              <AlternadorDeRama />
            </summary>
            <ul className={CLASE_DE_LISTA}>
              {nodo.hijos.map((hijo) => (
                <NodoDelArbol
                  key={hijo.lugar.id}
                  nodo={hijo}
                  cuentas={cuentas}
                  abrirTodo={abrirTodo}
                />
              ))}
            </ul>
          </details>
        </>
      ) : (
        <div className={`${CLASE_DE_FILA} ${sangria}`}>
          <ContenidoDeFila nodo={nodo} cuenta={cuenta} />
        </div>
      )}
      {nodo.masAdentro > 0 ? (
        <p className={`border-t border-caliza-divisor py-2 pr-4 ${sangria}`}>
          <Link
            href={hrefDeLugar(nodo)}
            className={`inline-flex items-center gap-1 rounded-sm underline underline-offset-2 hover:decoration-2 ${CLASES_DE_ETIQUETA} ${ANILLO_DE_FOCO}`}
          >
            {nodo.masAdentro} lugar{nodo.masAdentro === 1 ? "" : "es"} más
            adentro
            <CaretRight size={12} weight="bold" aria-hidden="true" />
          </Link>
        </p>
      ) : null}
    </li>
  );
}
