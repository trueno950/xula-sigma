import {
  ArrowsOutCardinal,
  CaretRight,
  PencilSimple,
  Prohibit,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import { type PropsDeContenido, rutaDe } from "./contenido";
import { FormularioDeBajaDeLugar } from "./FormularioDeBajaDeLugar";
import { FormularioDeEdicionDeLugar } from "./FormularioDeEdicionDeLugar";
import { FormularioDeReparenteo } from "./FormularioDeReparenteo";
import { PanelDeAccion } from "./PanelDeAccion";
import type { AccionDeNodo } from "./PanelDeNodo";
import { puedeAbrir } from "./permisos";

type ItemDeEdicion = {
  clave: Extract<AccionDeNodo, "renombrar" | "reparentear" | "baja">;
  etiqueta: string;
  descripcion: string;
  Icono: ComponentType<{ size?: number; className?: string }>;
  destructiva?: boolean;
};

/**
 * Cada accion trae su descripcion, y no es adorno: "Mover" no dice que se
 * lleva todo lo que cuelga debajo, y esa es exactamente la consecuencia que
 * el operador necesita saber **antes** de abrir el formulario.
 */
const ACCIONES: readonly ItemDeEdicion[] = [
  {
    clave: "renombrar",
    etiqueta: "Renombrar",
    descripcion: "Corregir el nombre del lugar.",
    Icono: PencilSimple,
  },
  {
    clave: "reparentear",
    etiqueta: "Mover",
    descripcion: "Colgarlo de otro lugar. Se mueve con todo lo que tiene.",
    Icono: ArrowsOutCardinal,
  },
  {
    clave: "baja",
    etiqueta: "Dar de baja",
    descripcion: "Sale del registro. Se rechaza si tiene algo adentro.",
    Icono: Prohibit,
    destructiva: true,
  },
];

/**
 * De que lugar cuelga este, para poder subir cuando se da de baja. La raiz
 * del arbol no esta en el subarbol y no cuelga de nada: `undefined`.
 */
const padreDe = (
  nodos: PropsDeContenido["nodos"],
  lugarId: PropsDeContenido["lugar"]["id"],
) => {
  const propio = nodos.find((nodo) => nodo.id === lugarId);

  return propio?.clase === "lugar" ? (propio.padreId ?? undefined) : undefined;
};

/** Pestana Editar: los cambios al lugar mismo, fuera del camino diario. */
export function TabDeEdicion({
  raizId,
  lugar,
  nodos,
  lugares,
  accion,
  permisos,
}: PropsDeContenido) {
  const disponibles = ACCIONES.filter((item) =>
    puedeAbrir(item.clave, permisos),
  );

  if (disponibles.length === 0) return null;

  const volverA = rutaDe({ raizId: raizId, nodoId: lugar.id, vista: "editar" });

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col">
        {disponibles.map((item) => (
          <li key={item.clave} className="border-b border-caliza-divisor">
            <Link
              href={rutaDe({
                raizId: raizId,
                nodoId: lugar.id,
                vista: "editar",
                accion: item.clave,
              })}
              aria-current={accion === item.clave ? "true" : undefined}
              aria-label={`${item.etiqueta}. ${item.descripcion}`}
              className="flex min-h-11 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-caliza-superficie focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-marca"
            >
              <item.Icono
                size={20}
                className={
                  item.destructiva ? "text-senial-error" : "text-caliza-apagada"
                }
              />
              <span className="flex min-w-0 flex-col">
                <span
                  className={`text-[15px] font-medium ${
                    item.destructiva ? "text-senial-error" : "text-caliza-tinta"
                  }`}
                >
                  {item.etiqueta}
                </span>
                <span className="text-[13px] text-caliza-apagada">
                  {item.descripcion}
                </span>
              </span>
              <CaretRight
                size={16}
                className="ml-auto shrink-0 text-caliza-apagada"
              />
            </Link>
          </li>
        ))}
      </ul>

      {accion === "renombrar" && puedeAbrir("renombrar", permisos) ? (
        <PanelDeAccion titulo={`Renombrar ${lugar.nombre}`}>
          <FormularioDeEdicionDeLugar
            raiz={raizId}
            nodo={lugar.id}
            nombreActual={lugar.nombre}
            volverA={volverA}
          />
        </PanelDeAccion>
      ) : null}

      {accion === "reparentear" && puedeAbrir("reparentear", permisos) ? (
        <PanelDeAccion titulo={`Mover ${lugar.nombre}`}>
          <FormularioDeReparenteo
            raiz={raizId}
            nodo={lugar.id}
            tipoDelLugar={lugar.tipo}
            lugares={lugares}
            padre={padreDe(nodos, lugar.id)}
            volverA={volverA}
          />
        </PanelDeAccion>
      ) : null}

      {accion === "baja" && puedeAbrir("baja", permisos) ? (
        <PanelDeAccion titulo="Baja de lugar">
          <FormularioDeBajaDeLugar
            raiz={raizId}
            nodo={lugar.id}
            padre={padreDe(nodos, lugar.id)}
            nombre={lugar.nombre}
            volverA={volverA}
          />
        </PanelDeAccion>
      ) : null}
    </div>
  );
}
