import { Boton } from "@/shared/ui";
import { darDeBajaLugarAction } from "./actions/darDeBajaLugarAction";

type Props = {
  /** Contexto del arbol: se da de baja el nodo seleccionado. */
  raiz: string;
  nodo: string;
  /**
   * El lugar del que cuelga, y a donde se sube al terminar. Ausente en una
   * raiz, que no cuelga de nada.
   */
  padre?: string | undefined;
  /** El nombre del lugar, escrito en el boton: la baja no es generica. */
  nombre: string;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * El boton es `peligro` y no `primaria`. Antes era de marca: en un
 * municipio de marca roja, "Dar de baja" y "Guardar" eran el mismo boton, y
 * `DESIGN.md` prohibe justamente eso -la marca no viste un rol semantico-.
 *
 * Y dice el nombre del lugar. Un "Dar de baja" a secas, despues de navegar
 * cuatro niveles, no confirma cual de los cuatro se esta dando de baja.
 * No hay dialogo de confirmacion a proposito: nada bloquea, y el nombre
 * escrito en el boton hace el mismo trabajo sin frenar a nadie.
 */
export function FormularioDeBajaDeLugar({ raiz, nodo, padre, nombre }: Props) {
  return (
    <form action={darDeBajaLugarAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="id" value={nodo} />
      {padre ? <input type="hidden" name="padre" value={padre} /> : null}

      <p className="text-[15px] text-caliza-tinta">
        El lugar queda de baja y deja de aparecer en el registro. Si tiene
        lugares debajo o domicilios, la baja se rechaza.
      </p>

      <Boton type="submit" variante="peligro">
        Dar de baja {nombre}
      </Boton>
    </form>
  );
}
