import { Boton, Campo } from "@/shared/ui";
import { renombrarCalleAction } from "./actions/renombrarCalleAction";
import type { CalleParaPanel } from "./vistaDeCalles";

type Props = {
  /** Contexto del arbol: a donde volver despues del renombre. */
  raiz: string;
  nodo: string;
  calle: CalleParaPanel;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * **Existia y no se renderizaba en ningun lado.** Estaba exportado desde el
 * barrel del modulo desde la rebanada 4, pero ninguna pestana lo montaba:
 * `renombrarCalleAction` era codigo alcanzable solo por un POST a mano. Una
 * calle mal escrita quedaba mal escrita en todos los domicilios que
 * colgaran de ella. Ahora vive en la pestana Calles, que es donde el
 * operador la esta mirando.
 *
 * Los `raiz`/`nodo` ocultos son nuevos: la accion ya los leia -su esquema
 * los declara opcionales- pero el formulario nunca se los mandaba, asi que
 * un renombre invalido volvia a `/territorio` sin raiz ni nodo, o sea a la
 * lista de lugares principales, y el operador perdia donde estaba.
 */
export function FormularioDeRenombreDeCalle({ raiz, nodo, calle }: Props) {
  return (
    <form action={renombrarCalleAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="id" value={calle.id} />

      <p className="text-[15px] text-caliza-tinta">{calle.nombre}</p>

      <Campo
        id="renombrar-calle-nombre"
        name="nombre"
        etiqueta="Nombre nuevo"
        required
        ayuda="El cambio alcanza a todos los domicilios de esa calle."
      />

      <Boton type="submit" variante="primaria">
        Renombrar
      </Boton>
    </form>
  );
}
