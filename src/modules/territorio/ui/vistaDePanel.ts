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

type DatosDePestanas = {
  readonly raizId: LugarId;
  readonly nodoId: LugarId;
  readonly vista: TabDeLugar;
  readonly cuentas: CuentasDeLugar;
  readonly abreLaEdicion: boolean;
};

const ETIQUETA_ACCESIBLE = {
  lugares: "Lugares",
  calles: "Calles",
  domicilios: "Domicilios (de este lugar y lo que contiene)",
} as const;

const hrefDePanel = (datos: DatosDePestanas, vista: TabDeLugar): string =>
  `/territorio?raiz=${datos.raizId}&nodo=${datos.nodoId}&vista=${vista}`;

const pestanaDeCuenta = (
  datos: DatosDePestanas,
  clave: keyof CuentasDeLugar,
  etiqueta: string,
): Pestana => ({
  clave,
  etiqueta,
  cuenta: datos.cuentas[clave],
  href: hrefDePanel(datos, clave),
  activa: datos.vista === clave,
  etiquetaAccesible: `${ETIQUETA_ACCESIBLE[clave]}: ${datos.cuentas[clave]}`,
});

/**
 * Las cuatro pestanas del panel, con su cuenta y su `href`. "Editar" no
 * lleva cuenta -no es una categoria de contenido, es lo que se le hace al
 * lugar- y solo aparece si el rol tiene algo que hacer ahi.
 */
export const pestanasDePanel = (datos: DatosDePestanas): readonly Pestana[] => [
  pestanaDeCuenta(datos, "lugares", "Lugares"),
  pestanaDeCuenta(datos, "calles", "Calles"),
  pestanaDeCuenta(datos, "domicilios", "Domicilios"),
  ...(datos.abreLaEdicion
    ? [
        {
          clave: "editar",
          etiqueta: "Editar",
          href: hrefDePanel(datos, "editar"),
          activa: datos.vista === "editar",
        },
      ]
    : []),
];
