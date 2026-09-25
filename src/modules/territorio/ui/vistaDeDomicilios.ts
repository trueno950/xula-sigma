import type { OpcionDeLista } from "@/shared/ui";
import type { CalleDelMunicipio } from "../application/listarCallesDelMunicipio";
import type { NodoDeSubarbol } from "../application/puertos";
import {
  ETIQUETA_DE_TIPO_DE_LUGAR,
  type LugarId,
  puedeTenerCatalogoDeCalles,
  type TipoDeLugar,
} from "../domain";

/** Lo minimo para armar caminos: lo tienen `LugarGuardado` y el subarbol. */
export type LugarConPadre = {
  id: LugarId;
  tipo: TipoDeLugar;
  nombre: string;
  padreId: LugarId | null;
};

/** Un nivel de zona con su identidad. */
type EslabonDeZona = {
  id: LugarId;
  tipo: TipoDeLugar;
  nombre: string;
};

type Asentamiento = { id: LugarId; nombre: string };

export const lugaresDeNodos = (
  nodos: readonly NodoDeSubarbol[],
): readonly LugarConPadre[] =>
  nodos
    .filter(
      (nodo): nodo is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
        nodo.clase === "lugar",
    )
    .map(({ id, tipo, nombre, padreId }) => ({ id, tipo, nombre, padreId }));

/** "Calle 20 5" o "Calle 20 S/N": sin `#`, que ningun spec pide. */
export const direccionDe = (calle: string, numero: string | null) =>
  `${calle} ${numero ?? "S/N"}`;

/** `San Pedro — Tepakan › Pablo › 2`; sin camino queda solo el nombre. */
export const etiquetaDeCamino = (
  nombre: string,
  camino: readonly string[],
): string => (camino.length > 0 ? `${nombre} — ${camino.join(" › ")}` : nombre);

/**
 * La cadena de niveles del lugar, del mas profundo al mas alto. El
 * asentamiento queda afuera -es el limite de la cadena- y por eso se puede
 * pasar aparte cuando no esta en `lugares`.
 */
const cadenaDeZona = (
  lugares: readonly LugarConPadre[],
  lugarId: LugarId,
  asentamiento?: Asentamiento | undefined,
): readonly EslabonDeZona[] => {
  const porId = new Map(lugares.map((lugar) => [lugar.id, lugar]));
  const cadena: EslabonDeZona[] = [];
  const vistos = new Set<LugarId>();
  let actual = porId.get(lugarId);

  // Un ciclo de `padreId` en datos corruptos no puede colgar el render.
  while (actual && !vistos.has(actual.id) && actual.id !== asentamiento?.id) {
    vistos.add(actual.id);
    cadena.push({ id: actual.id, tipo: actual.tipo, nombre: actual.nombre });
    actual = actual.padreId ? porId.get(actual.padreId) : undefined;
  }

  return cadena;
};

/** El camino de nombres del asentamiento al padre: `Tepakan › Pablo › 2`. */
export const caminoDeLugar = (
  lugares: readonly LugarConPadre[],
  lugarId: LugarId,
  asentamiento?: Asentamiento | undefined,
): readonly string[] => {
  if (asentamiento && lugarId === asentamiento.id) return [];

  const camino = cadenaDeZona(lugares, lugarId, asentamiento)
    .slice(1)
    .map((eslabon) => eslabon.nombre)
    .reverse();

  return asentamiento ? [asentamiento.nombre, ...camino] : camino;
};

const nombreDeNivel = (eslabon: EslabonDeZona): string =>
  `${ETIQUETA_DE_TIPO_DE_LUGAR[eslabon.tipo]} ${eslabon.nombre}`;

/**
 * La frase que describe el guardado por defecto, no la seleccion actual:
 * el select es nativo y no vuelve a renderizar cuando el operador lo
 * cambia, asi que una frase sobre "lo elegido" mentiria apenas se toque.
 */
const resumenDeGuardado = (
  lugares: readonly LugarConPadre[],
  asentamiento: Asentamiento | undefined,
  zonaId: LugarId | "",
): string => {
  if (!zonaId) {
    return "Sin elegir colonia, se guarda en el asentamiento de la calle.";
  }

  const cadena = cadenaDeZona(lugares, zonaId, asentamiento);
  const niveles = asentamiento
    ? cadena
    : cadena.filter((eslabon) => !puedeTenerCatalogoDeCalles(eslabon.tipo));
  const cima =
    asentamiento?.nombre ??
    cadena.find((eslabon) => puedeTenerCatalogoDeCalles(eslabon.tipo))
      ?.nombre ??
    "su asentamiento";
  const guardado = [...niveles.map(nombreDeNivel), cima].join(" · ");

  return `Sin cambiar la colonia, se guarda en ${guardado}.`;
};

/** Las opciones de zona: los niveles del alcance, con su camino completo. */
export const opcionesDeNivel = (
  lugares: readonly LugarConPadre[],
  asentamiento?: Asentamiento | undefined,
): readonly OpcionDeLista[] =>
  lugares
    .filter((lugar) => !puedeTenerCatalogoDeCalles(lugar.tipo))
    .map((lugar) => {
      const camino = caminoDeLugar(lugares, lugar.id, asentamiento);

      return {
        valor: lugar.id,
        etiqueta: etiquetaDeCamino(lugar.nombre, camino),
        clave: [...camino, lugar.nombre].join(" › "),
      };
    })
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .map(({ valor, etiqueta }) => ({ valor, etiqueta }));

/** Las opciones de calle de la entrada: cada una con su asentamiento. */
export const opcionesDeCallesDelMunicipio = (
  calles: readonly CalleDelMunicipio[],
): readonly OpcionDeLista[] =>
  calles.map((calle) => ({
    valor: calle.id,
    etiqueta: etiquetaDeCamino(calle.nombre, [calle.asentamiento]),
  }));

export type NivelDelFormulario = {
  opciones: readonly OpcionDeLista[];
  /** El primer `<option>`: el asentamiento, o "Sin colonia" cuando no se conoce. */
  marcador: string;
  /** El nivel con el que abre el select: el nodo actual, o vacio. */
  inicial: LugarId | "";
  /** La frase completa que describe donde se guarda por defecto. */
  resumen: string;
};

export const zonaConInicial = (
  lugares: readonly LugarConPadre[],
  asentamiento: Asentamiento | undefined,
  inicial: LugarId | "",
): NivelDelFormulario => ({
  opciones: opcionesDeNivel(lugares, asentamiento),
  marcador: asentamiento
    ? `Sin colonia: ${asentamiento.nombre}`
    : "Sin colonia",
  inicial,
  resumen: resumenDeGuardado(lugares, asentamiento, inicial),
});

export const zonaDelFormulario = (
  lugares: readonly LugarConPadre[],
  asentamiento: Asentamiento | undefined,
  lugarActual: { id: LugarId; tipo: TipoDeLugar } | undefined,
): NivelDelFormulario => {
  const inicial =
    lugarActual && !puedeTenerCatalogoDeCalles(lugarActual.tipo)
      ? lugarActual.id
      : "";

  return zonaConInicial(lugares, asentamiento, inicial);
};
