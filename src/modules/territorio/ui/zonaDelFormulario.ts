import type { OpcionDeLista } from "@/shared/ui";
import {
  type LugarId,
  puedeTenerCatalogoDeCalles,
  type TipoDeLugar,
} from "../domain";
import {
  type GrupoDeColonias,
  mensajeSinColonias,
  type NivelDelFormulario,
} from "./coloniasDelAlta";
import {
  type Asentamiento,
  type LugarConPadre,
  opcionesDeNivel,
  resumenDeGuardado,
} from "./vistaDeDomicilios";

/**
 * El nivel de zona que arma el `<select>` de Colonia del alta y de la
 * correccion: sus opciones, el primer `<option>`, el nivel con el que abre y
 * la frase que describe donde se guarda. Vive aparte de
 * `vistaDeDomicilios.ts` porque esa vista se ocupa de como se lee un lugar y
 * este archivo de como se elige.
 */
export type { NivelDelFormulario } from "./coloniasDelAlta";

const AYUDA_SIN_ZONAS =
  "Todavía no hay colonias en el municipio: el domicilio se guarda en el asentamiento de la calle. Cree una colonia dentro del asentamiento para poder elegirla.";

const marcadorDe = (asentamiento: Asentamiento | undefined): string =>
  asentamiento ? `Sin colonia: ${asentamiento.nombre}` : "Sin colonia";

const asentamientoDe = (
  porId: ReadonlyMap<string, LugarConPadre>,
  lugarId: string,
): Asentamiento | undefined => {
  const vistos = new Set<string>();
  let actual = porId.get(lugarId);

  // Un ciclo de `padreId` en datos corruptos no puede colgar el render.
  while (actual && !vistos.has(actual.id)) {
    if (puedeTenerCatalogoDeCalles(actual.tipo)) {
      return { id: actual.id, nombre: actual.nombre };
    }
    vistos.add(actual.id);
    actual = actual.padreId ? porId.get(actual.padreId) : undefined;
  }

  return undefined;
};

const gruposDeColonias = (
  lugares: readonly LugarConPadre[],
  opciones: readonly OpcionDeLista[],
): readonly GrupoDeColonias[] => {
  const porId = new Map(lugares.map((lugar) => [lugar.id as string, lugar]));
  const grupos = new Map<string, GrupoDeColonias>();

  for (const opcion of opciones) {
    const asentamiento = asentamientoDe(porId, opcion.valor);
    if (!asentamiento) continue;
    const previas = grupos.get(asentamiento.id)?.opciones ?? [];
    grupos.set(asentamiento.id, {
      asentamiento,
      opciones: [...previas, opcion],
    });
  }

  return [...grupos.values()].sort((a, b) =>
    a.asentamiento.nombre.localeCompare(b.asentamiento.nombre, "es"),
  );
};

/** Con el asentamiento conocido todas sus colonias son un solo grupo. */
const gruposDelAlcance = (
  lugares: readonly LugarConPadre[],
  asentamiento: Asentamiento | undefined,
  opciones: readonly OpcionDeLista[],
): readonly GrupoDeColonias[] => {
  if (opciones.length === 0) return [];
  if (asentamiento) return [{ asentamiento, opciones }];

  return gruposDeColonias(lugares, opciones);
};

const resumenSinZonas = (asentamiento: Asentamiento | undefined): string =>
  asentamiento ? mensajeSinColonias(asentamiento.nombre) : AYUDA_SIN_ZONAS;

export const zonaConInicial = (
  lugares: readonly LugarConPadre[],
  asentamiento: Asentamiento | undefined,
  inicial: LugarId | "",
): NivelDelFormulario => {
  const opciones = opcionesDeNivel(lugares, asentamiento);
  const sinZonas = opciones.length === 0;

  return {
    opciones,
    sinZonas,
    grupos: gruposDelAlcance(lugares, asentamiento, opciones),
    marcador: marcadorDe(asentamiento),
    inicial,
    resumen: sinZonas
      ? resumenSinZonas(asentamiento)
      : resumenDeGuardado(lugares, asentamiento, inicial),
  };
};

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
