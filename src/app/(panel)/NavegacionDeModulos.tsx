import Link from "next/link";
import { MODULOS_DEL_PANEL } from "@/shared/ui/modulosDelPanel";
import { FilaDeModulos } from "./FilaDeModulos";

/**
 * La navegacion entre modulos, en dos formas reales segun el ancho.
 *
 * `barra` es una columna en el costado, visible desde 768px: la lista de
 * modulos queda a la vista todo el tiempo y tiene lugar para crecer, que es
 * lo que el roadmap pide. `fila` es una hilera arriba del contenido para
 * los anchos menores, donde una columna se comeria media pantalla; esa
 * forma la arma `FilaDeModulos`, que explica por que es una hoja de cliente.
 *
 * Los iconos no son decoracion: son la unica forma de que la fila de 768px
 * para abajo distinga los destinos sin repetir palabras completas.
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

  const enlaces = MODULOS_DEL_PANEL.map(({ nombre, ruta: destino, Icono }) => {
    const activo = ruta.startsWith(destino);

    return (
      <Link
        key={destino}
        href={destino}
        aria-current={activo ? "page" : undefined}
        className={`flex shrink-0 items-center gap-2 rounded-sm text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca ${
          esBarra ? "h-11 border-l-2 px-3" : "h-9 px-2.5"
        } ${
          activo
            ? esBarra
              ? "border-marca bg-caliza-relleno font-medium text-caliza-tinta"
              : "bg-caliza-relleno font-medium text-marca"
            : `${
                esBarra ? "border-transparent" : ""
              } text-caliza-apagada hover:bg-caliza-superficie hover:text-caliza-tinta`
        }`}
      >
        <Icono size={20} weight={activo ? "fill" : "regular"} />
        {nombre}
      </Link>
    );
  });

  if (esBarra) {
    return (
      <nav aria-label="Módulos" className="flex flex-col gap-0.5 p-3">
        {enlaces}
      </nav>
    );
  }

  return <FilaDeModulos ruta={ruta}>{enlaces}</FilaDeModulos>;
}
