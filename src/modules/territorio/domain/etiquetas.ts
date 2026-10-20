import type { TipoDeLugar } from "./tipoDeLugar";

/**
 * Como se lee cada tipo de lugar ante una persona. `Record<TipoDeLugar,
 * string>`: un tipo nuevo sin etiqueta no compila. El codigo ("comisaria")
 * sigue siendo lo que se guarda y lo que viaja en el formulario.
 */
export const ETIQUETA_DE_TIPO_DE_LUGAR: Record<TipoDeLugar, string> = {
  cabecera: "Cabecera",
  comisaria: "Comisaría",
  colonia: "Colonia",
};

/** El tipo en medio de una frase: "Kantirix, comisaría", no "Comisaría". */
export const tipoDeLugarEnFrase = (tipo: TipoDeLugar): string =>
  ETIQUETA_DE_TIPO_DE_LUGAR[tipo].toLowerCase();
