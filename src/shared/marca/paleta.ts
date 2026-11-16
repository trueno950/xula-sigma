/**
 * La paleta sugerida de S1: colores primarios y de acento ya medidos.
 *
 * Existe porque elegir un color libre a ciegas es la forma mas facil de
 * terminar con un boton ilegible, y una lista corta de colores
 * institucionales resuelve el caso normal de un clic. El color libre sigue
 * ahi para el municipio que trae el suyo (S1).
 *
 * Son `oklch` como los valores por defecto de `globals.css`: el mismo
 * espacio de color que el design system, y la claridad se lee en el archivo.
 * `paleta.test.ts` mide cada uno contra el texto que `textoSobre` le
 * asigna, que es lo unico que impide ofrecer un color que despues la reja
 * rechace.
 */

export type ColorDePaleta = {
  /** Lo que ve la operadora en el formulario. */
  nombre: string;
  /** Lo que se guarda en `marca.primario` o `marca.secundario`. */
  valor: string;
};

export const PALETA: readonly ColorDePaleta[] = [
  { nombre: "Guinda", valor: "oklch(0.42 0.12 25)" },
  { nombre: "Ladrillo", valor: "oklch(0.47 0.14 35)" },
  { nombre: "Oro", valor: "oklch(0.84 0.14 90)" },
  { nombre: "Verde", valor: "oklch(0.44 0.1 155)" },
  { nombre: "Petróleo", valor: "oklch(0.45 0.08 200)" },
  { nombre: "Celeste", valor: "oklch(0.8 0.09 230)" },
  { nombre: "Azul", valor: "oklch(0.45 0.13 250)" },
  { nombre: "Morado", valor: "oklch(0.42 0.12 300)" },
];
