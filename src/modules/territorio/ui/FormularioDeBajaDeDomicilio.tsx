import { Boton } from "@/shared/ui";
import { darDeBajaDomicilioAction } from "./actions/darDeBajaDomicilioAction";

type Props = {
  raiz: string;
  nodo: string;
  domicilio: string;
  direccion: string;
};

/** Server Component, `<form action={...}>` nativo sin `"use client"`. */
export function FormularioDeBajaDeDomicilio({
  raiz,
  nodo,
  domicilio,
  direccion,
}: Props) {
  return (
    <form action={darDeBajaDomicilioAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="bajaDomicilio" />
      <input type="hidden" name="domicilioId" value={domicilio} />

      <p className="text-[15px] text-caliza-apagada">
        {`${direccion} deja de listarse y no se puede asignar en una mudanza.`}
      </p>

      <Boton type="submit" variante="peligro">
        Dar de baja
      </Boton>
    </form>
  );
}
