import {
  type EstadoDeLista,
  EstadoVacio,
  type OpcionDeLista,
} from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import type { FiltrosDeIntervenciones } from "../application/puertosDeLectura";
import type { ConteosDeIntervenciones } from "../domain";
import {
  ChipsDeFiltrosDeIntervenciones,
  FiltrosDeIntervenciones as Filtros,
} from "./FiltrosDeIntervenciones";
import { PliegueDeFiltrosDeIntervenciones } from "./FiltrosDeIntervencionesPliegue";
import { TableroDeIntervenciones } from "./TableroDeIntervenciones";
import { ResumenDeConteos } from "./TableroDeIntervencionesResumen";

type Props = {
  intervenciones: readonly IntervencionGuardada[];
  lugares: readonly OpcionDeLista[];
  /** Los conteos por estado con los filtros puestos y el estado quitado (S2). */
  conteos: ConteosDeIntervenciones;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeIntervenciones;
};

/**
 * La bandeja de `intervenciones-ux` en la direccion elegida en L5: los
 * filtros plegables con su cuenta y sus chips, y el tablero por estado.
 *
 * El vacio **inicial** sigue siendo el de `EstadoVacio` -la pantalla no tiene
 * nada y ofrece llenarla-. El vacio por filtro, en cambio, lo dice cada
 * columna: con los filtros puestos el tablero no desaparece, porque las cuatro
 * columnas en cero son la respuesta (S5).
 *
 * El total desglosado va arriba de los filtros, como en el artboard: es lo
 * primero que la operadora lee de la bandeja. Con el vacio inicial no se
 * pinta, porque «0 intervenciones» no dice nada que el vacio no diga mejor.
 */
export function ListadoDeIntervenciones({
  intervenciones,
  lugares,
  conteos,
  estadoDeLista: estado,
  filtros,
}: Props) {
  const activos = [filtros.estado, filtros.tipo, filtros.lugarId].filter(
    Boolean,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {estado.clase === "vacio-inicial" ? null : (
        <ResumenDeConteos conteos={conteos} conFiltros={activos > 0} />
      )}

      <PliegueDeFiltrosDeIntervenciones activos={activos}>
        <Filtros filtros={filtros} lugares={lugares} />
      </PliegueDeFiltrosDeIntervenciones>

      <ChipsDeFiltrosDeIntervenciones filtros={filtros} lugares={lugares} />

      {estado.clase === "vacio-inicial" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavía no hay intervenciones registradas."
          hrefSinFiltro="/intervenciones"
        />
      ) : (
        <TableroDeIntervenciones
          intervenciones={intervenciones}
          lugares={lugares}
          conteos={conteos}
          filtros={filtros}
        />
      )}
    </div>
  );
}
