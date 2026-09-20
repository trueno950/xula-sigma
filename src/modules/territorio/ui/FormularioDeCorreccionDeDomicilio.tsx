import { Boton, Campo, CampoDeLista, type OpcionDeLista } from "@/shared/ui";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import { corregirDomicilioAction } from "./actions/corregirDomicilioAction";
import type { NivelDelFormulario } from "./vistaDeDomicilios";

type Props = {
  raiz: string;
  nodo: string;
  domicilio: DomicilioGuardado;
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
};

/** Server Component, `<form action={...}>` nativo: mismos campos y orden que el alta, prefijados. */
export function FormularioDeCorreccionDeDomicilio({
  raiz,
  nodo,
  domicilio,
  calles,
  zona,
}: Props) {
  return (
    <form action={corregirDomicilioAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="corregirDomicilio" />
      <input type="hidden" name="domicilioId" value={domicilio.id} />

      <CampoDeLista
        id="correccion-calle-id"
        name="calleId"
        etiqueta="Calle"
        marcador="Seleccione una calle"
        opciones={calles}
        defaultValue={domicilio.calleId}
      />

      <Campo
        id="correccion-numero"
        name="numero"
        etiqueta="Numero"
        tipografia="dato"
        ayuda="Dejar vacio si el domicilio no tiene numero."
        defaultValue={domicilio.numero ?? ""}
      />

      <CampoDeLista
        id="correccion-entre-a-id"
        name="entreCalleAId"
        etiqueta="Entre calle"
        marcador="Ninguna"
        opcional
        opciones={calles}
        defaultValue={domicilio.entreCalleAId ?? ""}
      />

      <CampoDeLista
        id="correccion-entre-b-id"
        name="entreCalleBId"
        etiqueta="Y calle"
        marcador="Ninguna"
        opcional
        opciones={calles}
        defaultValue={domicilio.entreCalleBId ?? ""}
      />

      <Campo
        id="correccion-referencia"
        name="referencia"
        etiqueta="Referencia"
        ayuda="Una sena para encontrarlo: junto a la cancha, porton azul."
        defaultValue={domicilio.referencia ?? ""}
      />

      <details>
        <summary className="cursor-pointer text-[15px] font-medium text-caliza-tinta">
          Colonia (opcional)
        </summary>
        <div className="flex flex-col gap-4 pt-4">
          <CampoDeLista
            id="correccion-zona-id"
            name="zonaId"
            etiqueta="Colonia"
            marcador={zona.marcador}
            opcional
            opciones={zona.opciones}
            defaultValue={zona.inicial}
          />
          <p className="text-[15px] text-caliza-apagada">{zona.resumen}</p>
        </div>
      </details>

      <Boton type="submit" variante="primaria">
        Guardar cambios
      </Boton>
    </form>
  );
}
