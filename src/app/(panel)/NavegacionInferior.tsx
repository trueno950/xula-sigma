"use client";

import { DotsThree } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Rol } from "@/shared/auth/roles";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import {
  estaActivo,
  modulosDeBarraInferior,
} from "@/shared/ui/modulosDelPanel";
import { cerrarAlInteractuar } from "./cerrarAlInteractuar";

const CELDA =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[13px] font-medium transition-[color,background-color] duration-150 ease-salida";

/**
 * La barra inferior del movil (<1024px): el lateral hecho pulgar.
 *
 * Hasta cuatro destinos fijos y "Más". "Más" es un `<details>` nativo y no
 * una isla de cliente (`DESIGN.md`, Divulgacion progresiva): lleva el resto
 * de los modulos y, en `children`, lo que el layout quiera dejar a mano en
 * el movil, como el rol y cerrar sesion. `key={ruta}` lo vuelve a montar
 * cerrado al navegar, porque `<details>` no se cierra solo; Escape y el
 * toque fuera lo cierran con `cerrarAlInteractuar`.
 *
 * Icono y texto siempre; cada celda mide 56px de alto.
 *
 * Hoja de cliente por la misma razon que `NavegacionDeModulos`: sin
 * `usePathname`, el activo y el "Más" abierto se quedan en la pantalla vieja.
 */
export function NavegacionInferior({
  ruta: rutaDelServidor,
  rol,
  children,
}: {
  ruta: string;
  rol: Rol;
  children?: ReactNode;
}) {
  const ruta = usePathname() ?? rutaDelServidor;
  const { principales, resto } = modulosDeBarraInferior(rol);
  const activoEnMas = resto.some((modulo) => estaActivo(ruta, modulo.ruta));

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 flex items-stretch gap-1 border-t border-caliza-divisor bg-caliza-lienzo px-2 pt-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {principales.map(({ nombre, ruta: destino, Icono }) => {
        const activo = estaActivo(ruta, destino);

        return (
          <Link
            key={destino}
            href={destino}
            aria-current={activo ? "page" : undefined}
            className={`${CELDA} ${ANILLO_DE_FOCO} ${
              activo
                ? "bg-marca-suave text-caliza-tinta"
                : "text-caliza-apagada hover:bg-caliza-superficie"
            }`}
          >
            <span className={activo ? "text-marca" : undefined}>
              <Icono size={24} weight={activo ? "fill" : "regular"} />
            </span>
            {nombre}
          </Link>
        );
      })}
      <details
        key={ruta}
        ref={(menu) => (menu ? cerrarAlInteractuar(menu, document) : undefined)}
        className="group relative flex flex-1"
      >
        <summary
          className={`${CELDA} w-full cursor-pointer list-none ${ANILLO_DE_FOCO} marker:hidden group-open:bg-caliza-superficie ${
            activoEnMas
              ? "bg-marca-suave text-caliza-tinta"
              : "text-caliza-apagada hover:bg-caliza-superficie"
          }`}
        >
          <span className={activoEnMas ? "text-marca" : undefined}>
            <DotsThree size={24} weight="bold" />
          </span>
          Más
        </summary>
        <div className="absolute right-0 bottom-full mb-2 flex w-64 flex-col gap-0.5 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-2 shadow-flotante">
          {resto.map(({ nombre, ruta: destino, Icono }) => {
            const activo = estaActivo(ruta, destino);

            return (
              <Link
                key={destino}
                href={destino}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-[15px] font-semibold transition-[color,background-color] duration-150 ease-salida ${ANILLO_DE_FOCO} ${
                  activo
                    ? "bg-marca-suave text-caliza-tinta"
                    : "text-caliza-apagada hover:bg-caliza-superficie hover:text-caliza-tinta"
                }`}
              >
                <span className={activo ? "text-marca" : undefined}>
                  <Icono size={20} weight={activo ? "fill" : "regular"} />
                </span>
                {nombre}
              </Link>
            );
          })}
          {children ? (
            <div className="mt-1 border-t border-caliza-divisor pt-2">
              {children}
            </div>
          ) : null}
        </div>
      </details>
    </nav>
  );
}
