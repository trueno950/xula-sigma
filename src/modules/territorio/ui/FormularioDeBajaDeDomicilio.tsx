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
  /** `null`: la lectura fallo; el envio queda y decide el servidor. */
  residentes: readonly ResidenteDeDomicilio[] | null;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`. Con
 * residentes no hay envio: `darDeBajaDomicilio` lo rechazaria, y en su
 * lugar va a quien vive ahi con el enlace a su ficha, donde se registra la
 * mudanza. El rechazo del caso de uso sigue siendo la regla: lo leido
 * puede haber cambiado al enviar.
 */
export function FormularioDeBajaDeDomicilio({
  raiz,
  nodo,
  domicilio,
  direccion,
  residentes,
}: Props) {
  if (residentes && residentes.length > 0) {
    return (
      <p className="text-[15px] text-senial-error">
        {"Antes de dar de baja esta dirección hay que mudar a: "}
        <EnlacesDeResidentes residentes={residentes} />. Registre la mudanza
        desde su ficha.
      </p>
    );
  }

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

      <p className="text-[15px] text-caliza-apagada">
        {`${direccion} deja de listarse y no se puede asignar en una mudanza.`}
      </p>

      <Boton type="submit" variante="peligro">
        <Prohibit size={18} aria-hidden />
        {`Dar de baja ${direccion}`}
      </Boton>
    </form>
  );
}
