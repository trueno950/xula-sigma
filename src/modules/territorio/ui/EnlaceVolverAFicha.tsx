import Link from "next/link";
import { CLASES_DE_ENLACE } from "@/shared/ui";

/**
 * La vuelta a la ficha de una persona despues de tocar su direccion desde el
 * arbol: quien entro desde `/padron/<uuid>` no tiene que buscarla de nuevo.
 *
 * El destino entra ya validado por `regresoValido` (`regresoAFicha.ts`): este
 * componente no lo recorta ni lo interpreta.
 */
export function EnlaceVolverAFicha({ regreso }: { regreso: string }) {
  return (
    <Link href={regreso} className={`rounded-sm ${CLASES_DE_ENLACE}`}>
      Volver a la ficha
    </Link>
  );
}
