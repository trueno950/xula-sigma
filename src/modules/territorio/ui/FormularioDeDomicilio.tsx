import { Boton, Campo, CampoDeLista, type OpcionDeLista } from "@/shared/ui";
import { altaDeDomicilioAction } from "./actions/altaDeDomicilioAction";
import type { ZonaDelFormulario } from "./vistaDeDomicilios";

type Props = {
  /** Contexto del arbol: ausente en la entrada de la raiz. */
  raiz?: string | undefined;
  nodo?: string | undefined;
  /** Ya rotuladas por el borde: en el asentamiento, solo el nombre. */
  calles: readonly OpcionDeLista[];
  zona: ZonaDelFormulario;
  /** Presente solo cuando el catalogo de calles es de otro lugar. */
  hrefAdministrarCalles?: string | undefined;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * La calle abre el formulario porque es el unico campo obligatorio; la zona
 * es opcional y va plegada al final, con el resumen de donde se guarda. El
 * `<details>` nativo es el unico despliegue del sistema que no necesita
 * JavaScript.
 */
export function FormularioDeDomicilio({
  raiz,
  nodo,
  calles,
  zona,
  hrefAdministrarCalles,
}: Props) {
  return (
    <form action={altaDeDomicilioAction} className="flex flex-col gap-4">
      {raiz ? <input type="hidden" name="raiz" value={raiz} /> : null}
      {nodo ? <input type="hidden" name="nodo" value={nodo} /> : null}
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="domicilio" />

      <CampoDeLista
        id="domicilio-calle-id"
        name="calleId"
        etiqueta="Calle"
        marcador="Seleccione una calle"
        opciones={calles}
      />

      {hrefAdministrarCalles ? (
        <p className="text-[15px] text-caliza-apagada">
          Las calles pertenecen al asentamiento.{" "}
          <a
            href={hrefAdministrarCalles}
            className="text-marca underline underline-offset-2"
          >
            Administrar sus calles
          </a>
          .
        </p>
      ) : null}

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
          Zona (opcional)
        </summary>
        <div className="flex flex-col gap-4 pt-4">
          <CampoDeLista
            id="domicilio-zona-id"
            name="zonaId"
            etiqueta="Zona"
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
