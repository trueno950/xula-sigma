"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * La hilera movil de modulos.
 *
 * Existe como hoja de cliente por una sola razon: el destino activo puede
 * arrancar fuera del tramo visible -`Marca` es el ultimo modulo- y acercarlo
 * pide el navegador. El resto de la navegacion queda del servidor: los
 * enlaces llegan como hijos ya renderizados, con su `aria-current`, asi que
 * el SSR y el lector de pantalla no cambian. `block: "nearest"` es para no
 * arrastrar la pagina en vertical al posicionar la hilera.
 */
export function FilaDeModulos({
  children,
  ruta,
}: {
  children: ReactNode;
  /** La ruta real del request: cambia en cada navegacion del panel. */
  ruta: string;
}) {
  const fila = useRef<HTMLElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: la ruta es el disparador intencional: el layout no se remonta al navegar en cliente y sin ella el ajuste solo corria al montar.
  useEffect(() => {
    fila.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [ruta]);

  return (
    <nav
      ref={fila}
      aria-label="Módulos"
      className="flex h-12 items-center gap-1 overflow-x-auto border-b border-caliza-divisor px-2"
    >
      {children}
    </nav>
  );
}
