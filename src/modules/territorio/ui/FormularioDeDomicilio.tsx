import { Boton, Campo, CampoDeLista } from "@/shared/ui";
import type { CalleGuardada } from "../application/puertos";
import { altaDeDomicilioAction } from "./actions/altaDeDomicilioAction";
import { opcionesDeCalles } from "./opciones";

type Props = {
  /** Contexto del arbol: el domicilio cuelga del nodo seleccionado. */
  raiz: string;
  nodo: string;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"` (tasks.md 5.16).
 *
 * Las tres calles salen del mismo catalogo del lugar. Antes cada `<label>`
 * envolvia solo su texto y el `<select>` quedaba afuera: el `htmlFor`
 * apuntaba bien, pero el campo no tenia ayuda ni podia mostrar error.
 * `CampoDeLista` ata las tres cosas.
 */
export function FormularioDeDomicilio({ raiz, nodo, calles }: Props) {
  const opciones = opcionesDeCalles(calles);

  return (
    <form action={altaDeDomicilioAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="lugarId" value={nodo} />

      <CampoDeLista
        id="domicilio-calle-id"
        name="calleId"
        etiqueta="Calle"
        marcador="Seleccione una calle"
        opciones={opciones}
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
        opciones={opciones}
      />

      <CampoDeLista
        id="domicilio-entre-b-id"
        name="entreCalleBId"
        etiqueta="Y calle"
        marcador="Ninguna"
        opcional
        opciones={opciones}
      />

      <Campo
        id="domicilio-referencia"
        name="referencia"
        etiqueta="Referencia"
        ayuda="Una sena para encontrarlo: junto a la cancha, porton azul."
      />

      <Boton type="submit" variante="primaria">
        Dar de alta
      </Boton>
    </form>
  );
}
