import Link from "next/link";
import { ANILLO_DE_FOCO, CLASES_DE_ENLACE } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import type { FiltrosDeIntervenciones } from "../application/puertosDeLectura";
import {
  type EstadoDeIntervencion,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
} from "../domain";
import { InsigniaDeIntervencion } from "./InsigniaDeIntervencion";
import {
  enMinuscula,
  PLURAL_DE_ESTADO,
} from "./TableroDeIntervencionesResumen";
import { TarjetaDeIntervencion } from "./TarjetaDeIntervencion";

const SIN_LUGAR = "No disponible";

/**
 * Cuantas tarjetas caben en una columna antes de mandar el resto al listado
 * de ese estado (decision registrada del artboard `02-tablero-por-estado`):
 * una columna no crece sin fin, y a 269px la septima ya no se compara con
 * nada.
 */
const TARJETAS_POR_COLUMNA = 6;

/**
 * El listado de un estado con todas sus obras, conservando los otros filtros.
 * Es el «Ver las 7 planificadas» del pie de cada columna: navegacion, nunca
 * estado de cliente.
 */
const hrefConEstado = (
  filtros: FiltrosDeIntervenciones,
  estado: EstadoDeIntervencion,
): string => {
  const query = new URLSearchParams({ estado });
  if (filtros.tipo) query.set("tipo", filtros.tipo);
  if (filtros.lugarId) query.set("lugarId", filtros.lugarId);

  return `/intervenciones?${query.toString()}`;
};

/**
 * El vacio de una columna (S5). Nombra el estado y el lugar con sus
 * etiquetas -«Ninguna planificada en Sisal»-, nunca el valor de enum, y ofrece
 * quitar el filtro que la dejo asi. La columna no desaparece: su cuenta en
 * cero es informacion.
 */
function VacioDeColumna({
  estado,
  lugar,
  hayFiltros,
}: {
  estado: EstadoDeIntervencion;
  lugar: string | undefined;
  hayFiltros: boolean;
}) {
  const porque = !hayFiltros
    ? ""
    : lugar
      ? ` en ${lugar}`
      : " con estos filtros";

  return (
    <p className="rounded-lg border border-dashed border-caliza-divisor px-3 py-3.5 text-center text-[13px] leading-[1.4] text-caliza-apagada">
      Ninguna {enMinuscula(ETIQUETA_DE_ESTADO_DE_INTERVENCION[estado])}
      {porque}.{" "}
      {hayFiltros ? (
        <Link href="/intervenciones" className={CLASES_DE_ENLACE}>
          Quitar los filtros
        </Link>
      ) : null}
    </p>
  );
}

type Props = {
  estado: EstadoDeIntervencion;
  intervenciones: readonly IntervencionGuardada[];
  conteo: number;
  nombres: ReadonlyMap<string, string>;
  filtros: FiltrosDeIntervenciones;
  /** El nombre del lugar filtrado, para nombrarlo en el vacio. */
  lugarDelFiltro: string | undefined;
  hayFiltros: boolean;
};

/**
 * Una columna del tablero: la insignia de su estado con su cuenta en el
 * encabezado -que en el telefono se queda pegado al techo-, las tarjetas y,
 * si no caben todas, el enlace al listado de ese estado.
 */
export function ColumnaDeTablero({
  estado,
  intervenciones,
  conteo,
  nombres,
  filtros,
  lugarDelFiltro,
  hayFiltros,
}: Props) {
  const conEstadoPedido = filtros.estado !== undefined;
  const visibles = conEstadoPedido
    ? intervenciones
    : intervenciones.slice(0, TARJETAS_POR_COLUMNA);

  return (
    <section
      aria-labelledby={`columna-${estado}`}
      className="flex min-w-0 flex-col gap-2"
    >
      <div className="sticky top-0 z-10 flex min-h-11 items-center gap-2 border-b border-caliza-divisor bg-caliza-fondo px-1 lg:static">
        <h2 id={`columna-${estado}`} className="flex min-w-0 items-center">
          <InsigniaDeIntervencion estado={estado} />
        </h2>
        <span className="ml-auto font-mono text-[14px] tabular-nums text-caliza-apagada">
          {conteo}
        </span>
      </div>

      {visibles.map((intervencion) => (
        <TarjetaDeIntervencion
          key={intervencion.id}
          intervencion={intervencion}
          lugar={nombres.get(intervencion.lugarId) ?? SIN_LUGAR}
        />
      ))}

      {conteo === 0 ? (
        <VacioDeColumna
          estado={estado}
          lugar={lugarDelFiltro}
          hayFiltros={hayFiltros}
        />
      ) : null}

      {!conEstadoPedido && conteo > visibles.length ? (
        <Link
          href={hrefConEstado(filtros, estado)}
          className={`py-2 text-center text-[13px] font-medium text-caliza-apagada underline underline-offset-2 hover:text-caliza-tinta hover:decoration-2 ${ANILLO_DE_FOCO}`}
        >
          Ver las {conteo} {PLURAL_DE_ESTADO[estado]}
        </Link>
      ) : null}
    </section>
  );
}
