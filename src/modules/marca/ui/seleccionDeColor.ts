import { PALETA, PRIMARIO_POR_DEFECTO } from "@/shared/marca";

/**
 * El color exacto se escribe con un selector del navegador, y ese selector
 * solo habla `#rrggbb`; un `oklch` guardado no se puede precargar ahi. El
 * hex es el de la guinda por defecto, no un color nuevo.
 */
export const HEX_POR_DEFECTO = "#7a1f2b";

/** El valor del selector libre. Es un valor de radio, nunca un color. */
export const VALOR_LIBRE = "libre";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const esHex = (valor: string): boolean => HEX.test(valor);

const comoHexSeis = (valor: string): string => {
  if (valor.length !== 4) return valor;

  const [, rojo = "", verde = "", azul = ""] = valor;

  return `#${rojo}${rojo}${verde}${verde}${azul}${azul}`;
};

export type SeleccionDeColor = {
  /** El valor del radio que arranca marcado: un color de la paleta o "libre". */
  radio: string;
  /** Lo que muestra el selector libre. */
  libre: string;
};

/**
 * Que opcion arranca marcada para el color guardado.
 *
 * Un color que el selector puede representar se precarga en el selector y
 * marca "Otro color"; uno de la paleta marca su propia opcion. Cualquier
 * otra cosa —un `oklch` pegado a mano que la paleta no tiene— arranca en el
 * primario por defecto, para que el formulario siempre mande un color: sin
 * ninguno marcado, el POST no llevaria `primario` y la accion responderia
 * "elija un color" sobre una marca que si lo tiene.
 */
export const seleccionDeColor = (actual?: string): SeleccionDeColor => {
  if (actual && PALETA.some(({ valor }) => valor === actual)) {
    return { radio: actual, libre: HEX_POR_DEFECTO };
  }

  if (actual && esHex(actual)) {
    return { radio: VALOR_LIBRE, libre: comoHexSeis(actual) };
  }

  return { radio: PRIMARIO_POR_DEFECTO, libre: HEX_POR_DEFECTO };
};

/**
 * El color que el formulario elige para `campo`, o vacio si no eligio
 * ninguno. La comparten la accion y la isla de la muestra: si divergieran,
 * la muestra pintaria un color y el formulario guardaria otro.
 */
export const colorElegido = (
  datos: FormData,
  campo: "primario" | "secundario",
): string => {
  const eleccion = datos.get(campo);

  if (typeof eleccion !== "string") return "";
  if (eleccion !== VALOR_LIBRE) return eleccion;

  const libre = datos.get(`${campo}Libre`);

  return typeof libre === "string" ? libre : "";
};
