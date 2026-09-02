import { Boton, CampoDeLista } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import {
  destinosDeReparenteo,
  type LugarId,
  puedeSerRaiz,
  type TipoDeLugar,
} from "../domain";
import { reparentearLugarAction } from "./actions/reparentearLugarAction";
import { opcionesDeLugares } from "./opciones";

type Props = {
  /** Contexto del arbol: se mueve el nodo seleccionado. */
  raiz: string;
  nodo: LugarId;
  /** El tipo del lugar que se mueve: decide que lugares pueden recibirlo. */
  tipoDelLugar: TipoDeLugar;
  /** Todos los lugares activos del municipio, sin filtrar. */
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * El catalogo llega entero y se filtra aca con `destinosDeReparenteo`.
 * Antes llegaba ya recortado al subarbol de la raiz abierta, y eso hacia
 * dos cosas mal: mover un lugar a otra rama del municipio era imposible
 * -su destino nunca estaba en la lista-, y una raiz sin hijos daba un
 * select con cero opciones, que es como se encontro `norte`.
 *
 * Un tipo de rango 0 no tiene destino posible: `puedeContener` lo descarta
 * contra los cinco tipos. Por eso ese caso no muestra un select vacio ni la
 * opcion "sin lugar padre" -que era un envio que no movia nada-, sino la
 * frase que explica por que no hay a donde moverlo.
 */
export function FormularioDeReparenteo({
  raiz,
  nodo,
  tipoDelLugar,
  lugares,
}: Props) {
  const destinos = destinosDeReparenteo(
    { id: nodo, tipo: tipoDelLugar },
    lugares,
  );

  if (destinos.length === 0) {
    return (
      <p className="text-[15px] text-caliza-apagada">
        {puedeSerRaiz(tipoDelLugar)
          ? `Una ${tipoDelLugar} es un asentamiento del municipio: no cuelga de ningun otro lugar.`
          : `Todavia no hay ningun lugar en el municipio que pueda contener una ${tipoDelLugar}.`}
      </p>
    );
  }

  return (
    <form action={reparentearLugarAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="lugarId" value={nodo} />

      <CampoDeLista
        id="lugar-padre-nuevo-id"
        name="nuevoPadreId"
        etiqueta="Nuevo lugar padre"
        marcador={`Elija donde va esta ${tipoDelLugar}`}
        opciones={opcionesDeLugares(destinos)}
        ayuda="Todo lo que cuelga de este lugar se mueve con el."
      />

      <Boton type="submit" variante="primaria">
        Mover lugar
      </Boton>
    </form>
  );
}
