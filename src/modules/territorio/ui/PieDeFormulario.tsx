import type { ReactNode } from "react";
import { BarraDeAcciones, EnlaceDeAccion } from "@/shared/ui";

export function PieDeFormulario({
  volverA,
  children,
}: {
  volverA?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <BarraDeAcciones>
      {children}
      {volverA ? (
        <EnlaceDeAccion href={volverA} variante="fantasma">
          Cancelar
        </EnlaceDeAccion>
      ) : null}
    </BarraDeAcciones>
  );
}
