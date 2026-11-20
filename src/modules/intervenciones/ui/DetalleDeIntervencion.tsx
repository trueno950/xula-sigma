import type { ReactNode } from "react";
import type { HistorialDeIntervencion } from "../application/historialDeIntervencion";
import type { IntervencionGuardada } from "../application/puertos";
import type { ReferenciasDeIntervencion } from "../application/puertosDeLectura";
import { FichaDeIntervencion } from "./FichaDeIntervencion";
import { HistorialDeIntervenciones } from "./HistorialDeIntervenciones";

type Props = {
  intervencion: IntervencionGuardada;
  referencias: ReferenciasDeIntervencion;
  historial: HistorialDeIntervencion;
  /**
   * El panel de acciones, o el aviso de permiso que lo sustituye. Sin el, la
   * ficha y el historial ocupan el ancho y no queda una columna vacia.
   */
  acciones?: ReactNode;
};

const TITULO =
  "text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta";

/**
 * El cuerpo de `/intervenciones/[id]` en dos columnas desde 1024px (S10-S15
 * de `intervenciones-ux`): el mismo corte que `DetalleDeReporte`, que es el
 * que el usuario ya eligio para un detalle del municipio.
 *
 * El marcado va en el orden de lectura del telefono -ficha, acciones,
 * historial- y las columnas se resuelven con `grid`: debajo de 1024px las
 * tres cosas se apilan en ese orden. La columna de acciones ocupa las dos
 * filas de la izquierda para que el `sticky` de adentro tenga recorrido, y la
 * segunda fila es `1fr` para que el alto que gana el panel al abrir un
 * pliegue no empuje el historial.
 */
export function DetalleDeIntervencion({
  intervencion,
  referencias,
  historial,
  acciones,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-8">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <FichaDeIntervencion
          intervencion={intervencion}
          referencias={referencias}
          registradaPor={historial.registradaPor}
        />
      </div>

      {acciones ? (
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {acciones}
        </div>
      ) : null}

      <section className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:self-start">
        <h2 className={TITULO}>Historial de cambios</h2>
        <HistorialDeIntervenciones revisiones={historial.revisiones} />
      </section>
    </div>
  );
}
