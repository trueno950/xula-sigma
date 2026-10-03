import type { PasoDeMigaja as EnlaceDeMigaja, Pestana } from "@/shared/ui";
import type { LugarId } from "../domain";

type PasoDeArbol = { readonly id: LugarId; readonly nombre: string };
type TabDeLugar = "lugares" | "calles" | "domicilios" | "editar";
type CuentasDeLugar = {
  readonly lugares: number;
  readonly calles: number;
  readonly domicilios: number;
};

/**
 * El camino de la migaja: "Territorio" siempre primero -el mismo nombre que
 * el titulo de la raiz y que las otras pantallas del modulo-, cada paso previo con
 * enlace, y el ultimo sin `href` -es el paso actual, no algo a donde ir-.
 */
export const pasosDeMigaja = (
  raizId: LugarId,
  migaja: readonly PasoDeArbol[],
): readonly EnlaceDeMigaja[] => {
  const ultimo = migaja[migaja.length - 1];

  return [
    { etiqueta: "Territorio", href: "/territorio" },
    ...migaja.map((paso) => ({
      etiqueta: paso.nombre,
      ...(paso.id === ultimo?.id
        ? {}
        : { href: `/territorio?raiz=${raizId}&nodo=${paso.id}` }),
    })),
  ];
};

/**
 * Las cuatro pestanas del panel, con su cuenta y su `href`. "Editar" no
 * lleva cuenta -no es una categoria de contenido, es lo que se le hace al
 * lugar- y solo aparece si el rol tiene algo que hacer ahi.
 */
export const pestanasDePanel = ({
  raizId,
  nodoId,
  vista,
  cuentas,
  abreLaEdicion,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  vista: TabDeLugar;
  cuentas: CuentasDeLugar;
  abreLaEdicion: boolean;
}): readonly Pestana[] => [
  {
    clave: "lugares",
    etiqueta: "Lugares",
    cuenta: cuentas.lugares,
    href: `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=lugares`,
    activa: vista === "lugares",
    etiquetaAccesible: `Lugares: ${cuentas.lugares}`,
  },
  {
    clave: "calles",
    etiqueta: "Calles",
    cuenta: cuentas.calles,
    href: `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=calles`,
    activa: vista === "calles",
    etiquetaAccesible: `Calles (de este lugar): ${cuentas.calles}`,
  },
  {
    clave: "domicilios",
    etiqueta: "Domicilios",
    cuenta: cuentas.domicilios,
    href: `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=domicilios`,
    activa: vista === "domicilios",
    etiquetaAccesible: `Domicilios (de este lugar y lo que contiene): ${cuentas.domicilios}`,
  },
  ...(abreLaEdicion
    ? [
        {
          clave: "editar",
          etiqueta: "Editar",
          href: `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=editar`,
          activa: vista === "editar",
        },
      ]
    : []),
];
