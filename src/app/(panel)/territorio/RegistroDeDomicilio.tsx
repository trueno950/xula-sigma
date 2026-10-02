import { FormularioDeDomicilio } from "@/modules/territorio/ui";
import { PanelDeAccion } from "@/modules/territorio/ui/PanelDeAccion";
import type { NivelDelFormulario } from "@/modules/territorio/ui/vistaDeDomicilios";
import type { OpcionDeLista } from "@/shared/ui";

type Props = {
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  volverA: string;
  /** El asentamiento abierto: en error, volver a su pestaana Domicilios. */
  raiz: string;
  /** El lugar abierto: idem, para no perder el nodo de la vista. */
  nodo: string;
};

/**
 * El alta de domicilio servida dentro del lugar: vive en la pestana
 * Domicilios de su asentamiento, con las calles de ahi. El estado sigue en
 * la URL: `volverA` regresa a la pestana al cerrar el formulario, y los
 * `raiz`/`nodo` ocultos hacen que un error regrese al mismo lugar.
 */
export function RegistroDeDomicilio({
  calles,
  zona,
  volverA,
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
