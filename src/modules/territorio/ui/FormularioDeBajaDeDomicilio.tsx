import { Prohibit } from "@phosphor-icons/react/ssr";
import { Boton } from "@/shared/ui";
import type { ResidenteDeDomicilio } from "../application/puertosDeResidencias";
import { darDeBajaDomicilioAction } from "./actions/darDeBajaDomicilioAction";
import { EnlacesDeResidentes } from "./ResidentesDeDomicilio";

type Props = {
  raiz: string;
  nodo: string;
  domicilio: string;
  direccion: string;
  residentes: readonly ResidenteDeDomicilio[];
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`. El
 * aviso de residentes no reemplaza al rechazo de `darDeBajaDomicilio`: lo
 * anticipa con lo que el panel leyo, que puede haber cambiado al enviar.
 */
export function FormularioDeBajaDeDomicilio({
  raiz,
  nodo,
  domicilio,
  direccion,
  residentes,
}: Props) {
  return (
    <form
      action={darDeBajaDomicilioAction}
      className="flex flex-col gap-4 sm:items-start"
    >
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="domicilios" />
      <input type="hidden" name="accion" value="bajaDomicilio" />
      <input type="hidden" name="domicilio" value={domicilio} />
      <input type="hidden" name="domicilioId" value={domicilio} />

      {residentes.length > 0 ? (
        <p className="text-[15px] text-senial-error">
          {"Antes de dar de baja esta dirección, registre la mudanza de: "}
          <EnlacesDeResidentes residentes={residentes} />.
        </p>
      ) : (
        <p className="text-[15px] text-caliza-apagada">
          {`${direccion} deja de listarse y no se puede asignar en una mudanza.`}
        </p>
      )}

      <Boton type="submit" variante="peligro">
        <Prohibit size={18} aria-hidden />
        {`Dar de baja ${direccion}`}
      </Boton>
    </form>
  );
}
