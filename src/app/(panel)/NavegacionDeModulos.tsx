"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@/shared/auth/roles";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import { estaActivo, modulosAgrupados } from "@/shared/ui/modulosDelPanel";

/**
 * La navegacion lateral de escritorio, agrupada por area.
 *
 * El activo se marca con `aria-current="page"` y con fondo de marca suave,
 * peso de tipografia e icono lleno: solo con color, el operador que no
 * distingue tonos no sabe en que modulo esta. Nunca una franja lateral
 * (`DESIGN.md`, Don't). El icono va en marca y la etiqueta en tinta: la
 * marca no es color de texto sobre claro.
 *
 * Los grupos y la visibilidad por rol salen de `modulosAgrupados`.
 */
export function NavegacionDeModulos({
  ruta,
  rol,
}: {
  /** La ruta real del request, escrita por el proxy. */
  ruta: string;
  rol: Rol;
}) {
  const actual = usePathname() ?? ruta;

  return (
    <nav aria-label="Módulos" className="flex flex-col gap-6 p-3">
      {modulosAgrupados(rol).map(({ titulo, modulos }) => (
        <section key={titulo} aria-label={titulo} className="flex flex-col">
          <h2 className="px-3 pb-1 text-[13px] font-medium text-caliza-apagada">
            {titulo}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {modulos.map(({ nombre, ruta: destino, Icono }) => {
              const activo = estaActivo(actual, destino);

              return (
                <li key={destino}>
                  <Link
                    href={destino}
                    aria-current={activo ? "page" : undefined}
                    className={`flex h-11 items-center gap-3 rounded-md px-3 text-[15px] font-semibold transition-[color,background-color] duration-150 ease-salida ${ANILLO_DE_FOCO} ${
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
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
