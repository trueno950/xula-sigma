import { FormularioDeDomicilio } from "@/modules/territorio/ui";
import { PanelDeAccion } from "@/modules/territorio/ui/PanelDeAccion";
import type { NivelDelFormulario } from "@/modules/territorio/ui/zonaDelFormulario";
import type { OpcionDeLista } from "@/shared/ui";

type Props = {
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  origenDeCalles?: string | undefined;
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
  origenDeCalles,
  volverA = "/territorio",
  raiz,
  nodo,
}: Props) {
  return (
    <PanelDeAccion titulo="Registrar domicilio">
      <FormularioDeDomicilio
        calles={calles}
        zona={zona}
        origenDeCalles={origenDeCalles}
        volverA={volverA}
        raiz={raiz}
        nodo={nodo}
      />
    </PanelDeAccion>
  );
}
