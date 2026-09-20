import { FormularioDeDomicilio } from "@/modules/territorio/ui";
import { PanelDeAccion } from "@/modules/territorio/ui/PanelDeAccion";
import type { NivelDelFormulario } from "@/modules/territorio/ui/vistaDeDomicilios";
import type { OpcionDeLista } from "@/shared/ui";

type Props = {
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
};

/**
 * El alta de domicilio servida desde la entrada del modulo, sin `?raiz=`.
 *
 * Vive aparte de la pagina porque la entrada es la unica pantalla con dos
 * formularios posibles -este y el de asentamiento- y su rama de JSX era la
 * que empujaba a `PaginaDeTerritorio` por encima de la metrica de
 * complejidad. El estado sigue en la URL: `volverA` cierra el formulario.
 */
export function RegistroDeDomicilio({ calles, zona }: Props) {
  return (
    <PanelDeAccion titulo="Registrar domicilio" volverA="/territorio">
      <FormularioDeDomicilio calles={calles} zona={zona} />
    </PanelDeAccion>
  );
}
