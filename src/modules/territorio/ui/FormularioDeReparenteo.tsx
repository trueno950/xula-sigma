import { Boton, CampoDeLista } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import {
  destinosDeReparenteo,
  type LugarId,
  puedeSerRaiz,
  type TipoDeLugar,
  tipoDeLugarEnFrase,
} from "../domain";
import { reparentearLugarAction } from "./actions/reparentearLugarAction";
import { opcionesDeLugares } from "./opciones";
import { ofertaDeReparenteo } from "./reparenteo";

type Props = {
  /** Contexto del arbol: se mueve el nodo seleccionado. */
  raiz: string;
  nodo: LugarId;
  /** El tipo del lugar que se mueve: decide que lugares pueden recibirlo. */
  tipoDelLugar: TipoDeLugar;
  /** Todos los lugares activos del municipio, sin filtrar. */
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  /** De quien cuelga hoy. Ausente si ya es una raiz del municipio. */
  padre?: LugarId | undefined;
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
 * Que se ofrece lo decide `ofertaDeReparenteo`, y ahi esta el por que de
 * las tres salidas: el select, soltarlo del padre, o la frase que explica
 * que no hay nada que hacer.
 */
export function FormularioDeReparenteo({
  raiz,
  nodo,
  tipoDelLugar,
  lugares,
  padre,
}: Props) {
  const destinos = destinosDeReparenteo(
    { id: nodo, tipo: tipoDelLugar },
    lugares,
  );

  const oferta = ofertaDeReparenteo({
    destinos: destinos.length,
    puedeSerRaiz: puedeSerRaiz(tipoDelLugar),
    tienePadre: padre !== undefined,
  });

  if (!oferta.muestraDestinos && !oferta.muestraDesanclar) {
    return (
      <p className="text-[15px] text-caliza-apagada">
        {puedeSerRaiz(tipoDelLugar)
          ? `Una ${tipoDeLugarEnFrase(tipoDelLugar)} es un asentamiento del municipio: no cuelga de ningun otro lugar.`
          : `Todavia no hay ningun lugar en el municipio que pueda contener este lugar.`}
      </p>
    );
  }

  return (
    <form action={reparentearLugarAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="editar" />
      <input type="hidden" name="accion" value="reparentear" />
      <input type="hidden" name="lugarId" value={nodo} />

      {/*
        El input oculto solo cuando no hay select. Con los dos, el `<form>`
        tendria dos campos `nuevoPadreId` y `formData.get` devuelve el
        primero: soltar ganaria siempre y el select no moveria nada. Con
        select, soltar entra como una opcion mas.
      */}
      {oferta.muestraDesanclar && !oferta.muestraDestinos ? (
        <>
          <input type="hidden" name="nuevoPadreId" value="" />
          <p className="text-[15px] text-caliza-tinta">
            Esta {tipoDeLugarEnFrase(tipoDelLugar)} cuelga de otro lugar, y no
            deberia: es un asentamiento del municipio. Soltarla la deja en el
            primer nivel con todo lo que tiene adentro.
          </p>
        </>
      ) : null}

      {oferta.muestraDestinos ? (
        <CampoDeLista
          id="lugar-padre-nuevo-id"
          name="nuevoPadreId"
          etiqueta="Nuevo lugar padre"
          marcador={"Elija donde va este lugar"}
          opciones={[
            ...(oferta.muestraDesanclar
              ? [
                  {
                    valor: "",
                    etiqueta: "Sin lugar padre (asentamiento del municipio)",
                  },
                ]
              : []),
            ...opcionesDeLugares(destinos),
          ]}
          ayuda="Todo lo que cuelga de este lugar se mueve con el."
        />
      ) : null}

      <Boton type="submit" variante="primaria">
        {oferta.muestraDestinos ? "Mover lugar" : "Soltar del lugar padre"}
      </Boton>
    </form>
  );
}
