import Link from "next/link";
import type { Rol } from "@/shared/auth/roles";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import { modulosAgrupados } from "@/shared/ui/modulosDelPanel";

const CLASES_DE_TARJETA_ACCIONABLE =
  "flex h-full flex-col gap-3 rounded-lg border border-caliza-divisor " +
  "bg-caliza-lienzo p-5 text-caliza-tinta shadow-reposo " +
  "transition-[box-shadow,border-color] duration-150 ease-salida " +
  `hover:border-caliza-borde hover:shadow-elevada ${ANILLO_DE_FOCO}`;

const ANCHO_EN_SM = ["", "sm:col-span-2"] as const;
const ANCHO_EN_LG = [
  "lg:col-span-1",
  "lg:col-span-2",
  "lg:col-span-3",
] as const;

/**
 * Cuantas columnas ocupa la primera tarjeta para que la ultima fila del
 * grupo quede llena: lo que falta para completar la fila, sumado a 1.
 */
export const anchoDelPrimero = (modulos: number, columnas: number): number =>
  1 + ((columnas - (modulos % columnas)) % columnas);

const clasesDelPrimero = (modulos: number): string =>
  [
    ANCHO_EN_SM[anchoDelPrimero(modulos, 2) - 1],
    ANCHO_EN_LG[anchoDelPrimero(modulos, 3) - 1],
  ]
    .filter(Boolean)
    .join(" ");

/**
 * Los modulos del rol, agrupados por area con los mismos helpers que la
 * navegacion lateral: lo que el rol no puede abrir no se ofrece.
 *
 * La primera tarjeta de cada grupo —en Atencion, Padron, lo que mas se abre
 * en ventanilla— absorbe el hueco de la ultima fila, asi ningun grupo deja
 * una tarjeta huerfana y las tarjetas no son una rejilla de cajas iguales.
 */
export function InicioDeModulos({ rol }: { rol: Rol }) {
  const grupos = modulosAgrupados(rol);

  return (
    <nav aria-label="Módulos" className="flex flex-col gap-8">
      {grupos.map(({ titulo, modulos }) => (
        <section
          key={titulo}
          aria-labelledby={`grupo-${titulo}`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`grupo-${titulo}`}
            className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta"
          >
            {titulo}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo, indice) => (
              <li
                key={modulo.ruta}
                className={
                  indice === 0 ? clasesDelPrimero(modulos.length) : undefined
                }
              >
                <Link
                  href={modulo.ruta}
                  className={CLASES_DE_TARJETA_ACCIONABLE}
                >
                  <modulo.Icono size={24} />
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-[15px] leading-[1.4] font-semibold">
                      {modulo.nombre}
                    </strong>
                    <span className="text-[15px] text-caliza-apagada">
                      {modulo.descripcion}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
