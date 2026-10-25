import { Boton, type OpcionDeLista } from "@/shared/ui";
import { altaDeDomicilioAction } from "./actions/altaDeDomicilioAction";
import { CamposDeDomicilio } from "./CamposDeDomicilio";
import { VALOR_SIN_COLONIA } from "./declaracionDeDestino";
import { PieDeFormulario } from "./PieDeFormulario";
import type { NivelDelFormulario } from "./zonaDelFormulario";

type Props = {
  /** Ya rotuladas por el borde: en el asentamiento, solo el nombre. */
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  declaracionDeDestino: string;
  origenDeCalles?: string | undefined;
  volverA?: string;
  /** Navegacion de retorno; ver `actions/volverAlArbol.ts`. */
  raiz?: string | undefined;
  nodo?: string | undefined;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 */
const zonaParaAlta = (zona: NivelDelFormulario): NivelDelFormulario => {
  if (zona.sinZonas) return zona;

  return {
    ...zona,
    marcador: zona.inicial
      ? zona.marcador
      : "Elija una colonia o indique que no tiene",
    resumen: zona.inicial
      ? zona.resumen
      : "Elija una colonia o «Sin colonia» si la dirección no pertenece a una colonia.",
    opciones: [
      ...zona.opciones,
      {
        valor: VALOR_SIN_COLONIA,
        etiqueta: "Sin colonia (la dirección no pertenece a una colonia)",
      },
    ],
  };
};

export function FormularioDeDomicilio({
  calles,
  zona,
  declaracionDeDestino,
  origenDeCalles,
  raiz,
  nodo,
  volverA,
}: Props) {
  const zonaDeAlta = zonaParaAlta(zona);

  return (
    <form action={altaDeDomicilioAction} className="flex flex-col gap-6">
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="domicilio" />
      {raiz ? <input type="hidden" name="raiz" value={raiz} /> : null}
      {nodo ? <input type="hidden" name="nodo" value={nodo} /> : null}

      <p className="text-[15px] text-caliza-apagada">{declaracionDeDestino}</p>

      <CamposDeDomicilio
        prefijo="domicilio"
        nombreDeZona="lugarId"
        calles={calles}
        zona={zonaDeAlta}
        origenDeCalles={origenDeCalles}
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
