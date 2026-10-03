import { MagnifyingGlass, Tray } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import type { EstadoDeLista } from "./estadoDeLista";
import { CLASES_DE_TARJETA, clasesDeBoton } from "./estilos";

type Props = {
  estado: Exclude<EstadoDeLista, { clase: "con-filas" }>;
  /** Que es esta pantalla, en una linea, cuando todavia no tiene nada. */
  mensajeInicial: string;
  /** El boton primario que la llena. Un icono de linea, nunca ilustracion. */
  accion?: ReactNode;
  /** La misma pantalla sin el filtro puesto. */
  hrefSinFiltro: string;
};

const CONTENEDOR = `flex flex-col items-center gap-4 px-6 py-12 text-center ${CLASES_DE_TARJETA}`;

const ICONO = {
  size: 40,
  weight: "light",
  "aria-hidden": true,
  className: "text-caliza-apagada",
} as const;

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
      <div className={CONTENEDOR}>
        <MagnifyingGlass {...ICONO} />
        <p className="text-[15px] text-caliza-tinta">
          Sin resultados para{" "}
          <span className="font-semibold">{estado.filtro}</span>.
        </p>
        <Link href={hrefSinFiltro} className={clasesDeBoton("secundaria")}>
          Quitar el filtro
        </Link>
      </div>
    );
  }

  return (
    <div className={CONTENEDOR}>
      <Tray {...ICONO} />
      <p className="text-[15px] text-caliza-apagada">{mensajeInicial}</p>
      {accion}
    </div>
  );
}
