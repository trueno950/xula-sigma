import type { ReactNode } from "react";
import { EnlaceDeAccion, Panel } from "@/shared/ui";

/**
 * La barra de una pestana: sus acciones, arriba de la lista y alineadas a
 * la derecha.
 *
 * Antes cada accion era un boton de marca **debajo** de su lista, asi que
 * en una pestana con veinte lugares habia que bajar hasta el final para
 * agregar el veintiuno, y con las tres pestanas de contenido habia tres
 * botones de marca compitiendo por ser el primario de la pantalla. Arriba,
 * y una sola primaria por pestana.
 */
export function BarraDeAcciones({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {children}
    </div>
  );
}

/**
 * El formulario que se abrio, en su propia superficie y con la salida al
 * final.
 *
 * El pie agrupado -envio y "Cancelar" en la misma barra- lo pone el
 * formulario, que recibe su `volverA`: adentro del `<form>` "Cancelar"
 * navega sin enviar y comparte la fila con el envio. Esta tarjeta conserva
 * el respaldo para quien arma el panel con un formulario que no lleva pie
 * propio.
 */
export function PanelDeAccion({
  titulo,
  volverA,
  children,
}: {
  titulo: string;
  volverA?: string;
  children: ReactNode;
}) {
  return (
    <Panel titulo={titulo}>
      {children}
      {volverA ? (
        <EnlaceDeAccion href={volverA} variante="fantasma">
          Cancelar
        </EnlaceDeAccion>
      ) : null}
    </Panel>
  );
}
