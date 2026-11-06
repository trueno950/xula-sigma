import { FormularioDeDomicilio } from "@/modules/territorio/ui";
import type { BorradorDeDomicilio } from "@/modules/territorio/ui/borradorDeDomicilio";
import { PanelDeAccion } from "@/modules/territorio/ui/PanelDeAccion";
import type { NivelDelFormulario } from "@/modules/territorio/ui/zonaDelFormulario";
import type { OpcionDeLista } from "@/shared/ui";

type Props = {
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  declaracionDeDestino: string;
  origenDeCalles?: string | undefined;
  volverA?: string;
  /**
   * Navegacion de retorno; ver
   * `src/modules/territorio/ui/actions/volverAlArbol.ts`.
   */
  raiz?: string | undefined;
  nodo?: string | undefined;
  /** La ficha a la que vuelve el alta; ver `regresoAFicha.ts`. */
  regreso?: string | undefined;
  borrador?: BorradorDeDomicilio | null | undefined;
};

export function RegistroDeDomicilio({
  calles,
  zona,
  declaracionDeDestino,
  origenDeCalles,
  volverA = "/territorio",
  raiz,
  nodo,
  regreso,
  borrador,
}: Props) {
  return (
    <PanelDeAccion titulo="Registrar domicilio">
      <FormularioDeDomicilio
        calles={calles}
        zona={zona}
        declaracionDeDestino={declaracionDeDestino}
        origenDeCalles={origenDeCalles}
        volverA={volverA}
        raiz={raiz}
        nodo={nodo}
        regreso={regreso}
        borrador={borrador}
      />
    </PanelDeAccion>
  );
}
