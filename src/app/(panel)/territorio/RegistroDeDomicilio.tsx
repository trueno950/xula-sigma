import { FormularioDeDomicilio } from "@/modules/territorio/ui";
import { PanelDeAccion } from "@/modules/territorio/ui/PanelDeAccion";
import type { NivelDelFormulario } from "@/modules/territorio/ui/vistaDeDomicilios";
import type { OpcionDeLista } from "@/shared/ui";

type Props = {
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  volverA?: string;
  /**
   * Navegacion de retorno; ver
   * `src/modules/territorio/ui/actions/volverAlArbol.ts`.
   */
  raiz?: string | undefined;
  nodo?: string | undefined;
};

export function RegistroDeDomicilio({
  calles,
  zona,
  volverA = "/territorio",
  raiz,
  nodo,
}: Props) {
  return (
    <PanelDeAccion titulo="Registrar domicilio" volverA={volverA}>
      <FormularioDeDomicilio
        calles={calles}
        zona={zona}
        raiz={raiz}
        nodo={nodo}
      />
    </PanelDeAccion>
  );
}
