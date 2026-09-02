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
 * "Cancelar" va **despues** del envio y no antes: leido de arriba abajo, el
 * orden anterior ofrecia irse antes de mostrar de que se trataba. Y es
 * fantasma, no un segundo boton con peso: cancelar no compite con guardar.
 */
export function PanelDeAccion({
  titulo,
  volverA,
  children,
}: {
  titulo: string;
  volverA: string;
  children: ReactNode;
}) {
  return (
    <Panel titulo={titulo}>
      {children}
      <EnlaceDeAccion href={volverA} variante="fantasma">
        Cancelar
      </EnlaceDeAccion>
    </Panel>
  );
}
