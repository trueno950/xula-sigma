import { BarraDeAcciones, Boton, type OpcionDeLista } from "@/shared/ui";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import { corregirDomicilioAction } from "./actions/corregirDomicilioAction";
import { type BorradorDeDomicilio, camposPara } from "./borradorDeDomicilio";
import { CamposDeDomicilio } from "./CamposDeDomicilio";
import type { NivelDelFormulario } from "./zonaDelFormulario";

type Props = {
  raiz: string;
  nodo: string;
  domicilio: DomicilioGuardado;
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  /** Lo capturado en una correccion rechazada; ver `borradorEnCookie.ts`. */
  borrador?: BorradorDeDomicilio | null | undefined;
};

const guardados = (domicilio: DomicilioGuardado) => ({
  calleId: domicilio.calleId,
  numero: domicilio.numero ?? "",
  entreCalleAId: domicilio.entreCalleAId ?? "",
  entreCalleBId: domicilio.entreCalleBId ?? "",
  referencia: domicilio.referencia ?? "",
});

/** Server Component, `<form action={...}>` nativo: los mismos campos que el alta, sin grupos y prefijados. */
export function FormularioDeCorreccionDeDomicilio({
  raiz,
  nodo,
  domicilio,
  calles,
  zona,
  borrador,
}: Props) {
  const capturado = camposPara(borrador, {
    formulario: "correccion",
    domicilioId: domicilio.id,
  });

  return (
    <form action={corregirDomicilioAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="corregirDomicilio" />
      <input type="hidden" name="domicilioId" value={domicilio.id} />

      <CamposDeDomicilio
        prefijo="correccion"
        nombreDeZona="zonaId"
        calles={calles}
        zona={zona}
        agrupar={false}
        valores={capturado ?? guardados(domicilio)}
      />

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Guardar cambios
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
