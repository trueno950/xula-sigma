import { randomInt } from "node:crypto";
import { LARGO_MINIMO } from "./reglasDeClave";

/**
 * La contrasenia temporal que el sistema genera y le muestra una sola vez a
 * la administradora (decision del usuario, S4 de
 * `odd/tasks/administracion-de-usuarios.md`).
 *
 * **Sin los caracteres que se confunden al dictarlos**: cero y O, uno y
 * ele, i mayuscula. La clave la entrega una persona a otra —de viva voz o
 * en un papelito— y el modo de falla real no es que sea debil sino que la
 * operadora nueva no pueda entrar con lo que le dictaron. El alfabeto sigue
 * teniendo 57 simbolos: 16 posiciones dan ~93 bits, sobra contra el
 * diccionario y contra la fuerza bruta en linea.
 *
 * `randomInt` y no `Math.random`: la clave abre una cuenta del municipio, y
 * `randomInt` lee del generador criptografico del sistema.
 */
export const ALFABETO_DE_CLAVE_TEMPORAL =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Dieciseis y no doce. El minimo de `reglasDeClave` es el piso de la
 * contrasenia que elige una persona; esta la escribe una funcion, no cuesta
 * nada mas larga y no hay donde recordarla.
 */
export const LARGO_DE_CLAVE_TEMPORAL = Math.max(LARGO_MINIMO, 16);

export const generarClaveTemporal = (): string => {
  let clave = "";

  for (let posicion = 0; posicion < LARGO_DE_CLAVE_TEMPORAL; posicion += 1) {
    clave += ALFABETO_DE_CLAVE_TEMPORAL.charAt(
      randomInt(0, ALFABETO_DE_CLAVE_TEMPORAL.length),
    );
  }

  return clave;
};
