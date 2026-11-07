import { FormularioDeDomicilio } from "@/modules/territorio/ui";
import { ANCLA_DE_ALTA } from "@/modules/territorio/ui/anclaDeAlta";
import type { BorradorDeDomicilio } from "@/modules/territorio/ui/borradorDeDomicilio";
import type { AsentamientoDeCalle } from "@/modules/territorio/ui/coloniasDelAlta";
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
  /** Ver `asentamientosDeCalles`: sin el, la colonia no se acorta. */
  asentamientoDeCalle?: AsentamientoDeCalle | undefined;
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
  asentamientoDeCalle,
}: Props) {
  return (
    <PanelDeAccion titulo="Registrar domicilio" id={ANCLA_DE_ALTA}>
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
        asentamientoDeCalle={asentamientoDeCalle}
      />
    </PanelDeAccion>
  );
}
