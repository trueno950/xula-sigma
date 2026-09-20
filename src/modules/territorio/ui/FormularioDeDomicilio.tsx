import { Boton, Campo, CampoDeLista, type OpcionDeLista } from "@/shared/ui";
import { altaDeDomicilioAction } from "./actions/altaDeDomicilioAction";
import type { NivelDelFormulario } from "./vistaDeDomicilios";

type Props = {
  /** Ya rotuladas por el borde: en el asentamiento, solo el nombre. */
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * La calle abre el formulario porque es el unico campo obligatorio; la zona
 * es opcional y va plegada al final, con el resumen de donde se guarda. El
 * `<details>` nativo es el unico despliegue del sistema que no necesita
 * JavaScript.
 */
export function FormularioDeDomicilio({ calles, zona }: Props) {
  return (
    <form action={altaDeDomicilioAction} className="flex flex-col gap-4">
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="domicilio" />

      <CampoDeLista
        id="domicilio-calle-id"
        name="calleId"
        etiqueta="Calle"
        marcador="Seleccione una calle"
        opciones={calles}
      />

      <Campo
        id="domicilio-numero"
        name="numero"
        etiqueta="Numero"
        tipografia="dato"
        ayuda="Dejar vacio si el domicilio no tiene numero."
      />

      <CampoDeLista
        id="domicilio-entre-a-id"
        name="entreCalleAId"
        etiqueta="Entre calle"
        marcador="Ninguna"
        opcional
        opciones={calles}
      />

      <CampoDeLista
        id="domicilio-entre-b-id"
        name="entreCalleBId"
        etiqueta="Y calle"
        marcador="Ninguna"
        opcional
        opciones={calles}
      />

      <Campo
        id="domicilio-referencia"
        name="referencia"
        etiqueta="Referencia"
        ayuda="Una sena para encontrarlo: junto a la cancha, porton azul."
      />

      <details>
        <summary className="cursor-pointer text-[15px] font-medium text-caliza-tinta">
          Colonia (opcional)
        </summary>
        <div className="flex flex-col gap-4 pt-4">
          <CampoDeLista
            id="domicilio-lugar-id"
            name="lugarId"
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
        Dar de alta
      </Boton>
    </form>
  );
}
