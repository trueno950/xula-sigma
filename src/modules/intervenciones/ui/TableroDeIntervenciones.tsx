import type { OpcionDeLista } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import type { FiltrosDeIntervenciones } from "../application/puertosDeLectura";
import {
  type ConteosDeIntervenciones,
  ESTADOS_DE_INTERVENCION,
} from "../domain";
import { ColumnaDeTablero } from "./TableroDeIntervencionesColumna";

type Props = {
  intervenciones: readonly IntervencionGuardada[];
  lugares: readonly OpcionDeLista[];
  /** Los conteos del servidor, sin el estado: uno por columna (S2). */
  conteos: ConteosDeIntervenciones;
  filtros: FiltrosDeIntervenciones;
};

const hayFiltrosPuestos = (filtros: FiltrosDeIntervenciones): boolean =>
  [filtros.estado, filtros.tipo, filtros.lugarId].some(Boolean);

/**
 * El tablero por estado de `intervenciones-ux` (S2-S5): cuatro columnas con
 * su insignia y su cuenta, las obras como tarjetas y el orden escrito antes de
 * las columnas. El total desglosado lo pinta `ListadoDeIntervenciones` arriba
 * de los filtros, como en el artboard.
 *
 * En el telefono las cuatro columnas se apilan en cuatro secciones, con el
 * encabezado de cada una pegado al techo mientras se desplaza: asi no se
 * pierde de vista en que estado se esta.
 *
 * Con `?estado=` -el pie de una columna- el tablero muestra solo ese estado,
 * hasta el tope de la bandeja (`LIMITE_DE_BANDEJA`), para ver las obras que
 * no caben en la columna.
 */
export function TableroDeIntervenciones({
  intervenciones,
  lugares,
  conteos,
  filtros,
}: Props) {
  const nombres = new Map(
    lugares.map((lugar) => [lugar.valor, lugar.etiqueta]),
  );
  const estados = filtros.estado ? [filtros.estado] : ESTADOS_DE_INTERVENCION;
  const lugarDelFiltro = filtros.lugarId
    ? nombres.get(filtros.lugarId)
    : undefined;
  const hayFiltros = hayFiltrosPuestos(filtros);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-tight text-caliza-apagada">
        Dentro de cada columna, la ocurrencia más reciente va primero. El orden
        no cambia al filtrar.
      </p>

      <div className="grid gap-3 lg:grid-cols-4">
        {estados.map((estado) => (
          <ColumnaDeTablero
            key={estado}
            estado={estado}
            intervenciones={intervenciones.filter(
              (intervencion) => intervencion.estado === estado,
            )}
            conteo={conteos.porEstado[estado]}
            nombres={nombres}
            filtros={filtros}
            lugarDelFiltro={lugarDelFiltro}
            hayFiltros={hayFiltros}
          />
        ))}
      </div>
    </div>
  );
}
