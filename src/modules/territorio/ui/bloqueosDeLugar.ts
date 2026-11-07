import type { LugarGuardado } from "../application/puertos";
import {
  destinosDeReparenteo,
  type LugarId,
  puedeSerRaiz,
  type TipoDeLugar,
} from "../domain";
import { ofertaDeReparenteo } from "./reparenteo";

/**
 * Que se hace con una accion de la pestana Editar segun lo ya cargado:
 * ofrecerla, cambiarla por el motivo que la frena, o callarla porque no hay
 * nada que explicar. El servidor vuelve a decidir al enviar; esto solo
 * evita ofrecer un camino que ya se sabe rechazado.
 */
export type EstadoDeAccion =
  | { readonly clase: "disponible" }
  | { readonly clase: "bloqueada"; readonly motivo: string }
  | { readonly clase: "oculta" };

const DISPONIBLE: EstadoDeAccion = { clase: "disponible" };

export const cantidad = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

type Dependientes = {
  hijos: number;
  /** Del subarbol; `undefined` si las cuentas no se pudieron leer. */
  domicilios: number | undefined;
  calles: number;
  /** `undefined` si no se leyeron: entonces decide el servidor. */
  zonas: number | undefined;
};

/** Mismo orden que `exigirSinDependientes` en `darDeBajaLugar.ts`. */
export const estadoDeBajaDeLugar = ({
  hijos,
  domicilios = 0,
  calles,
  zonas = 0,
}: Dependientes): EstadoDeAccion => {
  const motivo = [
    hijos > 0 &&
      `Tiene ${cantidad(hijos, "colonia", "colonias")}. Délas de baja o muévalas primero.`,
    domicilios > 0 &&
      `Tiene ${cantidad(domicilios, "domicilio", "domicilios")}. Muévalos primero.`,
    calles > 0 &&
      `Tiene ${cantidad(calles, "calle", "calles")}. Délas de baja o muévalas primero.`,
    zonas > 0 &&
      `Tiene ${cantidad(zonas, "zona", "zonas")}. Délas de baja primero.`,
  ].find((texto): texto is string => typeof texto === "string");

  return motivo ? { clase: "bloqueada", motivo } : DISPONIBLE;
};

type Catalogo = readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];

type Movimiento = {
  lugar: { id: LugarId; tipo: TipoDeLugar };
  lugares: Catalogo;
  padre: LugarId | undefined;
  /** Del subarbol; `undefined` si las cuentas no se pudieron leer. */
  domicilios: number | undefined;
};

/**
 * Los destinos que de verdad mueven el lugar. Sale el padre de hoy, que no
 * es un movimiento. Con domicilios en el subarbol, `reparentearLugar`
 * rechaza cambiar de asentamiento, y un destino que puede ser raiz es su
 * propio asentamiento: solo queda el de hoy, que ya es el padre.
 */
export const destinosUtilesDeReparenteo = ({
  lugar,
  lugares,
  padre,
  domicilios = 0,
}: Movimiento): Catalogo =>
  destinosDeReparenteo(lugar, lugares).filter(
    (destino) =>
      destino.id !== padre && !(domicilios > 0 && puedeSerRaiz(destino.tipo)),
  );

export const estadoDeMover = (movimiento: Movimiento): EstadoDeAccion => {
  const { lugar, padre, domicilios = 0 } = movimiento;
  const oferta = ofertaDeReparenteo({
    destinos: destinosUtilesDeReparenteo(movimiento).length,
    puedeSerRaiz: puedeSerRaiz(lugar.tipo) && domicilios === 0,
    tienePadre: padre !== undefined,
  });
  if (oferta.muestraDestinos || oferta.muestraDesanclar) return DISPONIBLE;
  if (domicilios === 0) return { clase: "oculta" };

  return {
    clase: "bloqueada",
    motivo: `Tiene ${cantidad(domicilios, "domicilio", "domicilios")} y no puede cambiar de asentamiento. Muévalos primero.`,
  };
};
