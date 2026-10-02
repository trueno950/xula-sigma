import { FormularioDeDomicilio } from "@/modules/territorio/ui";
import { PanelDeAccion } from "@/modules/territorio/ui/PanelDeAccion";
import type { NivelDelFormulario } from "@/modules/territorio/ui/vistaDeDomicilios";
import type { OpcionDeLista } from "@/shared/ui";

type Props = {
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  volverA: string;
};

/**
 * El alta de domicilio servida dentro del lugar: vive en la pestana
 * Domicilios de su asentamiento, con las calles de ahi. El estado sigue en
 * la URL: `volverA` regresa a la pestana al cerrar el formulario.
 */
export function RegistroDeDomicilio({ calles, zona, volverA }: Props) {
  return (
    <PanelDeAccion titulo="Registrar domicilio" volverA={volverA}>
      <FormularioDeDomicilio calles={calles} zona={zona} />
    </PanelDeAccion>
  );
}
