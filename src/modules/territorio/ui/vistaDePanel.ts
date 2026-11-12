import type { PasoDeMigaja as EnlaceDeMigaja, Pestana } from "@/shared/ui";
import {
  type LugarId,
  puedeContener,
  puedeTenerCatalogoDeCalles,
  TIPOS_DE_LUGAR,
  type TipoDeLugar,
} from "../domain";
import { conRegreso } from "./regresoEnRuta";
import { nombreDeLoContenido } from "./tiposDelAlta";

type PasoDeArbol = { readonly id: LugarId; readonly nombre: string };
type TabDeLugar = "lugares" | "calles" | "domicilios" | "editar";
type CuentasDeLugar = {
  readonly lugares: number;
  readonly calles: number;
  readonly domicilios: number | undefined;
};

/**
 * El camino de la migaja: "Territorio" siempre primero -el mismo nombre que
 * el titulo de la raiz y que las otras pantallas del modulo-, cada paso previo con
 * enlace, y el ultimo sin `href` -es el paso actual, no algo a donde ir-.
 * `regreso` viaja en cada enlace con el que se puede clickear, igual que en
 * `rutaDe`: subir un nivel no pierde la ficha desde la que se entro.
 */
export const pasosDeMigaja = (
  raizId: LugarId,
  migaja: readonly PasoDeArbol[],
  regreso?: string | undefined,
): readonly EnlaceDeMigaja[] => {
  const ultimo = migaja[migaja.length - 1];

  return [
    {
      etiqueta: "Territorio",
      href: conRegreso("/territorio", regreso),
    },
    ...migaja.map((paso) => ({
      etiqueta: paso.nombre,
      ...(paso.id === ultimo?.id
        ? {}
        : {
            href: conRegreso(
              `/territorio?raiz=${raizId}&nodo=${paso.id}`,
              regreso,
            ),
          }),
    })),
  ];
};

type DatosDePestanas = {
  readonly raizId: LugarId;
  readonly nodoId: LugarId;
  readonly tipo: TipoDeLugar;
  readonly vista: TabDeLugar;
  readonly cuentas: CuentasDeLugar;
  readonly abreLaEdicion: boolean;
};

const ETIQUETA_ACCESIBLE = {
  calles: "Calles",
  domicilios: "Domicilios (de este lugar y lo que contiene)",
} as const;

const hrefDePanel = (datos: DatosDePestanas, vista: TabDeLugar): string =>
  `/territorio?raiz=${datos.raizId}&nodo=${datos.nodoId}&vista=${vista}`;

const pestanaDeCuenta = (
  datos: DatosDePestanas,
  clave: keyof CuentasDeLugar,
  etiqueta: string,
): Pestana => {
  const cuenta = datos.cuentas[clave];
  // "Lugares" cambia de nombre segun lo que cabe adentro; las otras dos no.
  const accesible = clave === "lugares" ? etiqueta : ETIQUETA_ACCESIBLE[clave];

  return {
    clave,
    etiqueta,
    href: hrefDePanel(datos, clave),
    activa: datos.vista === clave,
    ...(cuenta === undefined
      ? { etiquetaAccesible: accesible }
      : {
          cuenta,
          etiquetaAccesible: `${accesible}: ${cuenta}`,
        }),
  };
};

/**
 * Las pestanas disponibles del panel, con su cuenta y su `href`. "Editar"
 * no lleva cuenta -no es una categoria de contenido, es lo que se le hace al
 * lugar- y solo aparece si el rol tiene algo que hacer ahi.
 */
export const admiteLugares = (tipo: TipoDeLugar): boolean =>
  TIPOS_DE_LUGAR.some((hijo) => puedeContener(tipo, hijo));

export const vistaVisibleDeLugar = (
  vista: TabDeLugar,
  tipo: TipoDeLugar,
): TabDeLugar =>
  (vista === "lugares" && !admiteLugares(tipo)) ||
  (vista === "calles" && !puedeTenerCatalogoDeCalles(tipo))
    ? "domicilios"
    : vista;

export const pestanasDePanel = (datos: DatosDePestanas): readonly Pestana[] => [
  ...(admiteLugares(datos.tipo)
    ? [pestanaDeCuenta(datos, "lugares", nombreDeLoContenido(datos.tipo))]
    : []),
  ...(puedeTenerCatalogoDeCalles(datos.tipo)
    ? [pestanaDeCuenta(datos, "calles", "Calles")]
    : []),
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
