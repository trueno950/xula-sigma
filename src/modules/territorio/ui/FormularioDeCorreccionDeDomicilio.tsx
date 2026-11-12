import { Aviso, Boton, type OpcionDeLista } from "@/shared/ui";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import { corregirDomicilioAction } from "./actions/corregirDomicilioAction";
import {
  avisaRecorte,
  type BorradorDeDomicilio,
  camposPara,
  MENSAJE_DE_RECORTE,
} from "./borradorDeDomicilio";
import { CamposDeDomicilio } from "./CamposDeDomicilio";
import { PieDeFormulario } from "./PieDeFormulario";
import type { NivelDelFormulario } from "./zonaDelFormulario";

type Props = {
  raiz: string;
  nodo: string;
  domicilio: DomicilioGuardado;
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  /** Lo capturado en una correccion rechazada; ver `borradorEnCookie.ts`. */
  borrador?: BorradorDeDomicilio | null | undefined;
  /** El panel del domicilio, al que vuelve «Cancelar». */
  volverA: string;
  /** La ficha desde la que se entro; ver `regresoAFicha.ts`. */
  regreso?: string | undefined;
};

const guardados = (domicilio: DomicilioGuardado) => ({
  calleId: domicilio.calleId,
  numero: domicilio.numero ?? "",
  entreCalleAId: domicilio.entreCalleAId ?? "",
  entreCalleBId: domicilio.entreCalleBId ?? "",
  referencia: domicilio.referencia ?? "",
});

/** Server Component, `<form action={...}>` nativo: los mismos campos que el alta, en rejilla y prefijados. */
export function FormularioDeCorreccionDeDomicilio({
  raiz,
  nodo,
  domicilio,
  calles,
  zona,
  borrador,
  volverA,
  regreso,
}: Props) {
  const destino = {
    formulario: "correccion",
    domicilioId: domicilio.id,
  } as const;
  const capturado = camposPara(borrador, destino);

  return (
    <form action={corregirDomicilioAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="corregirDomicilio" />
      <input type="hidden" name="domicilioId" value={domicilio.id} />
      {regreso ? <input type="hidden" name="regreso" value={regreso} /> : null}

      {avisaRecorte(borrador, destino) ? (
        <Aviso tono="aviso">{MENSAJE_DE_RECORTE}</Aviso>
      ) : null}

      <CamposDeDomicilio
        prefijo="correccion"
        nombreDeZona="zonaId"
        calles={calles}
        zona={zona}
        agrupar={false}
        rejilla
        valores={capturado ?? guardados(domicilio)}
      />

      <PieDeFormulario volverA={volverA}>
        <Boton type="submit" variante="primaria">
          Guardar cambios
        </Boton>
      </PieDeFormulario>
    </form>
  );
}
