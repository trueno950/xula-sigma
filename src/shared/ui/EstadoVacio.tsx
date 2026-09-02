import Link from "next/link";
import type { ReactNode } from "react";
import type { EstadoDeLista } from "./estadoDeLista";

type Props = {
  estado: Exclude<EstadoDeLista, { clase: "con-filas" }>;
  /** Que es esta pantalla, en una linea, cuando todavia no tiene nada. */
  mensajeInicial: string;
  /** El boton primario que la llena. Sin ilustracion y sin microcopy. */
  accion?: ReactNode;
  /** La misma pantalla sin el filtro puesto. */
  hrefSinFiltro: string;
};

/**
 * Los dos vacios de `DESIGN.md`, que son dos mensajes porque son dos
 * problemas. El inicial dice que es la pantalla y ofrece llenarla; el de
 * filtro nombra el filtro que la dejo vacia y ofrece quitarlo.
 *
 * Confundirlos manda al operador a dar de alta un registro que ya existe,
 * escondido detras de una busqueda que no encontro nada.
 */
export function EstadoVacio({
  estado,
  mensajeInicial,
  accion,
  hrefSinFiltro,
}: Props) {
  if (estado.clase === "vacio-por-filtro") {
    return (
      <div className="flex flex-col items-start gap-2 py-8">
        <p className="text-[15px] text-caliza-tinta">
          Sin resultados para{" "}
          <span className="font-medium">{estado.filtro}</span>.
        </p>
        <Link
          href={hrefSinFiltro}
          className="text-[15px] text-marca underline underline-offset-2"
        >
          Quitar la busqueda
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="text-[15px] text-caliza-apagada">{mensajeInicial}</p>
      {accion}
    </div>
  );
}
