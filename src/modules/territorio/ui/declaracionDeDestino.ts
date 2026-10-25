import {
  ETIQUETA_DE_TIPO_DE_LUGAR,
  puedeTenerCatalogoDeCalles,
  type TipoDeLugar,
} from "../domain";

export const VALOR_SIN_COLONIA = "sin-colonia";

export type ContextoDeDestino =
  | { origen: "municipio"; tieneColonias: boolean }
  | {
      origen: "lugar";
      tipo: TipoDeLugar;
      nombre: string;
      asentamiento: string;
      tieneColonias: boolean;
    };

export const declaracionDeDestino = (contexto: ContextoDeDestino): string => {
  if (contexto.origen === "municipio") {
    return contexto.tieneColonias
      ? "Se guarda en la colonia que elija o, si selecciona «Sin colonia», en el asentamiento de la calle. Cada calle pertenece al catálogo del asentamiento indicado junto a ella."
      : "Se guarda en el asentamiento de la calle porque todavía no hay colonias registradas. Cada calle pertenece al catálogo del asentamiento indicado junto a ella.";
  }

  if (puedeTenerCatalogoDeCalles(contexto.tipo)) {
    return contexto.tieneColonias
      ? "Se guarda en el asentamiento solo si indica «Sin colonia»; de lo contrario, elija una colonia. Las calles son de su catálogo."
      : "Se guarda en el asentamiento. Las calles son de su catálogo.";
  }

  return `Se guarda en ${ETIQUETA_DE_TIPO_DE_LUGAR[contexto.tipo]} ${contexto.nombre}. Las calles son del catálogo de ${contexto.asentamiento}.`;
};
