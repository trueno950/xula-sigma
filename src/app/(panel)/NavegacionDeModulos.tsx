import {
  FileText,
  MapTrifold,
  Palette,
  UsersThree,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ComponentType } from "react";

type Modulo = {
  nombre: string;
  ruta: string;
  Icono: ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
};

/**
 * Los modulos del panel. El orden es el del trabajo de mostrador, no el
 * alfabetico: primero a quien se atiende, despues donde vive, despues el
 * documento que se le entrega. `Marca` va ultima porque se toca una vez.
 */
const MODULOS: readonly Modulo[] = [
  { nombre: "Padron", ruta: "/padron", Icono: UsersThree },
  { nombre: "Territorio", ruta: "/territorio", Icono: MapTrifold },
  { nombre: "Constancias", ruta: "/constancias", Icono: FileText },
  { nombre: "Marca", ruta: "/marca", Icono: Palette },
];

/**
 * La navegacion entre modulos, en dos formas reales segun el ancho.
 *
 * `barra` es una columna en el costado, visible desde 768px: la lista de
 * modulos queda a la vista todo el tiempo y tiene lugar para crecer, que es
 * lo que el roadmap pide. `fila` es una hilera arriba del contenido para
 * los anchos menores, donde una columna se comeria media pantalla.
 *
 * Los iconos no son decoracion: son la unica forma de que la fila de 768px
 * para abajo distinga cuatro destinos sin cuatro palabras completas.
 *
 * Marca la ubicacion con `aria-current="page"` **y** con fondo y peso de
 * tipografia. Solo con color, el operador que no distingue tonos no sabe en
 * que modulo esta.
 */
export function NavegacionDeModulos({
  ruta,
  forma,
}: {
  /** La ruta real del request, escrita por el proxy. */
  ruta: string;
  forma: "barra" | "fila";
}) {
  const esBarra = forma === "barra";

  return (
    <nav
      aria-label="Modulos"
      className={
        esBarra
          ? "flex flex-col gap-0.5 p-3"
          : "flex h-12 items-center gap-1 overflow-x-auto border-b border-caliza-divisor px-2"
      }
    >
      {MODULOS.map(({ nombre, ruta: destino, Icono }) => {
        const activo = ruta.startsWith(destino);

        return (
          <Link
            key={destino}
            href={destino}
            aria-current={activo ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-sm text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca ${
              esBarra ? "h-11 px-3" : "h-9 px-2.5"
            } ${
              activo
                ? "bg-caliza-relleno font-medium text-caliza-tinta"
                : "text-caliza-apagada hover:bg-caliza-superficie hover:text-caliza-tinta"
            }`}
          >
            <Icono size={20} weight={activo ? "fill" : "regular"} />
            {nombre}
          </Link>
        );
      })}
    </nav>
  );
}
