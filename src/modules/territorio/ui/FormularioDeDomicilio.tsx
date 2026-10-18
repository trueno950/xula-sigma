import { Boton, type OpcionDeLista } from "@/shared/ui";
import { altaDeDomicilioAction } from "./actions/altaDeDomicilioAction";
import { CamposDeDomicilio } from "./CamposDeDomicilio";
import { PieDeFormulario } from "./PieDeFormulario";
import type { NivelDelFormulario } from "./vistaDeDomicilios";

type Props = {
  /** Ya rotuladas por el borde: en el asentamiento, solo el nombre. */
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  volverA?: string;
  /** Navegacion de retorno; ver `actions/volverAlArbol.ts`. */
  raiz?: string | undefined;
  nodo?: string | undefined;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * La calle es el unico campo obligatorio; la colonia es opcional y vive
 * entre los campos de "Dónde", con el resumen de donde se guarda como
 * ayuda. Ver `CamposDeDomicilio`.
 */
export function FormularioDeDomicilio({
  calles,
  zona,
  raiz,
  nodo,
  volverA,
}: Props) {
  return (
    <form action={altaDeDomicilioAction} className="flex flex-col gap-6">
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="domicilio" />
      {raiz ? <input type="hidden" name="raiz" value={raiz} /> : null}
      {nodo ? <input type="hidden" name="nodo" value={nodo} /> : null}

      <CamposDeDomicilio
        prefijo="domicilio"
        nombreDeZona="lugarId"
        calles={calles}
        zona={zona}
        agrupar
      />

      <PieDeFormulario volverA={volverA}>
        <Boton type="submit" variante="primaria">
          Dar de alta
        </Boton>
      </PieDeFormulario>
    </form>
  );
}
