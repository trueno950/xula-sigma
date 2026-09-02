import Link from "next/link";
import type { ComponentProps } from "react";
import { clasesDeBoton, type VarianteDeBoton } from "./estilos";

type PropsDeBoton = Omit<ComponentProps<"button">, "className"> & {
  variante?: VarianteDeBoton;
};

/**
 * El boton de `DESIGN.md` seccion 5. Sin `className`: la variante es la
 * unica perilla, a proposito. Un `className` abierto es como cada pantalla
 * termino con su propia altura de boton.
 */
export function Boton({ variante, ...resto }: PropsDeBoton) {
  return <button className={clasesDeBoton(variante)} {...resto} />;
}

type PropsDeEnlace = Omit<ComponentProps<typeof Link>, "className"> & {
  variante?: VarianteDeBoton;
};

/**
 * Un enlace que se ve como boton. Existe aparte y no como una prop de
 * `Boton` porque navegar y enviar son cosas distintas para el navegador y
 * para el lector de pantalla: "Nueva persona" va a otra pantalla, no envia
 * nada, y tiene que anunciarse como enlace.
 */
export function EnlaceDeAccion({ variante, ...resto }: PropsDeEnlace) {
  return <Link className={clasesDeBoton(variante)} {...resto} />;
}
