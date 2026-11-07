import { Aviso, Boton, type OpcionDeLista } from "@/shared/ui";
import { altaDeDomicilioAction } from "./actions/altaDeDomicilioAction";
import {
  avisaRecorte,
  type BorradorDeDomicilio,
  camposPara,
  MENSAJE_DE_RECORTE,
} from "./borradorDeDomicilio";
import { CamposDeDomicilio } from "./CamposDeDomicilio";
import type { AsentamientoDeCalle } from "./coloniasDelAlta";
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
  regreso?: string | undefined;
  /** Lo capturado en un alta rechazada; ver `borradorEnCookie.ts`. */
  borrador?: BorradorDeDomicilio | null | undefined;
  /** Acorta la colonia a la calle elegida; ver `asentamientosDeCalles`. */
  asentamientoDeCalle?: AsentamientoDeCalle | undefined;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * En el alta el marcador no es una respuesta: un `lugarId` vacio con
 * colonias en el asentamiento es `ColoniaRequeridaError`. «Sin colonia» es
 * una sola opcion y viaja como `VALOR_SIN_COLONIA`.
 */
const zonaParaAlta = (zona: NivelDelFormulario): NivelDelFormulario => {
  if (zona.sinZonas) return zona;

  return {
    ...zona,
    marcador: "Elija una colonia o indique que no tiene",
    resumen: zona.inicial
      ? zona.resumen
      : "Elija una colonia o «Sin colonia» si la dirección no pertenece a una colonia.",
    sinColonia: {
      valor: VALOR_SIN_COLONIA,
      etiqueta: "Sin colonia (la dirección no pertenece a una colonia)",
    },
  };
};

export function FormularioDeDomicilio({
  calles,
  zona,
  declaracionDeDestino,
  origenDeCalles,
  raiz,
  nodo,
  regreso,
  volverA,
  borrador,
  asentamientoDeCalle,
}: Props) {
  const zonaDeAlta = zonaParaAlta(zona);
  const destino = { formulario: "alta" } as const;
  const capturado = camposPara(borrador, destino);

  return (
    <form action={altaDeDomicilioAction} className="flex flex-col gap-6">
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="domicilio" />
      {raiz ? <input type="hidden" name="raiz" value={raiz} /> : null}
      {nodo ? <input type="hidden" name="nodo" value={nodo} /> : null}
      {regreso ? <input type="hidden" name="regreso" value={regreso} /> : null}

      <p className="text-[15px] text-caliza-apagada">{declaracionDeDestino}</p>

      {avisaRecorte(borrador, destino) ? (
        <Aviso tono="aviso">{MENSAJE_DE_RECORTE}</Aviso>
      ) : null}

      <CamposDeDomicilio
        prefijo="domicilio"
        nombreDeZona="lugarId"
        calles={calles}
        zona={zonaDeAlta}
        origenDeCalles={origenDeCalles}
        {...(capturado ? { valores: capturado } : {})}
        agrupar
        asentamientoDeCalle={asentamientoDeCalle}
      />

      <PieDeFormulario volverA={volverA}>
        <Boton type="submit" variante="primaria">
          Registrar domicilio
        </Boton>
      </PieDeFormulario>
    </form>
  );
}
