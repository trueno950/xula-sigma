import type { ReactNode } from "react";
import type { ReporteDeDetalle } from "../application/detalleDeReporte";
import type { MovimientoGuardado } from "../application/puertosDeMovimientos";
import { FichaDeReporte } from "./FichaDeReporte";
import { HistorialDeReporte } from "./HistorialDeReporte";

type Props = {
  reporte: ReporteDeDetalle;
  historial: readonly MovimientoGuardado[];
  atraso: number | null;
  /**
   * El panel de acciones, o el aviso de permiso que lo sustituye. Sin el, la
   * ficha y el historial ocupan el ancho y no queda una columna vacia.
   */
  acciones?: ReactNode;
};

/**
 * El cuerpo de `/reportes/detalle/[id]` en dos columnas desde 1024px (S13,
 * S15 de `reportes-ux`): ficha e historial a la izquierda, acciones en una
 * columna propia de 320px.
 *
 * El marcado va en el orden de lectura del telefono -ficha, acciones,
 * historial- y las columnas se resuelven con `grid`: debajo de 1024px las
 * tres cosas se apilan en ese mismo orden, con el historial al cierre y nunca
 * detras de un formulario.
 *
 * La columna de acciones ocupa las dos filas de la izquierda para que el
 * `sticky` de adentro tenga recorrido: si solo midiera lo suyo, no se
 * moveria. La segunda fila es `1fr` y no `auto`: el alto que gana el panel al
 * abrir una accion va a esa fila y no a la de la ficha, asi que el historial
 * no baja cada vez que se despliega un formulario.
 */
export function DetalleDeReporte({
  reporte,
  historial,
  atraso,
  acciones,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-8">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <FichaDeReporte reporte={reporte} atraso={atraso} />
      </div>

      {acciones ? (
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {acciones}
        </div>
      ) : null}

      <section className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:self-start">
        <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
          Historial
        </h2>
        <HistorialDeReporte historial={historial} />
      </section>
    </div>
  );
}
