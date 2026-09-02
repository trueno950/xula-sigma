import { CaretRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Fragment } from "react";

export type PasoDeMigaja = {
  etiqueta: string;
  /** Sin `href` es el paso actual: el ultimo, y no es un enlace. */
  href?: string;
};

/**
 * El camino hasta donde se esta parado, y la forma de volver.
 *
 * En territorio es la unica salida de un lugar hondo: la jerarquia puede
 * tener cuatro niveles y el boton de atras del navegador no dice a cual
 * vuelve. Cada paso previo es un enlace; el ultimo lleva `aria-current` y
 * es texto.
 *
 * El separador es un icono con `aria-hidden`, no un caracter: un `›` de
 * texto lo lee el lector de pantalla como "mayor que" en cada paso.
 */
export function Migaja({
  pasos,
  etiqueta,
}: {
  pasos: readonly PasoDeMigaja[];
  etiqueta: string;
}) {
  return (
    <nav
      aria-label={etiqueta}
      className="flex flex-wrap items-center gap-1 text-[13px] text-caliza-apagada"
    >
      {pasos.map((paso, indice) => (
        <Fragment key={`${paso.etiqueta}-${paso.href ?? "actual"}`}>
          {indice > 0 ? (
            <CaretRight size={12} aria-hidden="true" className="shrink-0" />
          ) : null}
          {paso.href ? (
            <Link
              href={paso.href}
              className="rounded-sm text-marca hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              {paso.etiqueta}
            </Link>
          ) : (
            <span aria-current="page" className="text-caliza-tinta">
              {paso.etiqueta}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
