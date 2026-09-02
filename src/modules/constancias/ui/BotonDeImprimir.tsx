import { Printer } from "@phosphor-icons/react/ssr";
import { clasesDeBoton } from "@/shared/ui";

type Props = {
  id: string;
};

/**
 * `<a href>` nativo, cero `"use client"` (design.md de
 * `constancias-oficios`, seccion 11: "cero `use client` en todo el camino
 * de emision-a-PDF"). El navegador abre `/constancias/{id}/pdf` en una
 * pestania nueva -el Route Handler genera el PDF con `Content-Disposition:
 * inline`- sin que este componente sepa nada de PDFs ni de React Server
 * Actions.
 *
 * Toma las clases del boton pero no es `EnlaceDeAccion`: ese envuelve
 * `next/link`, que prefetchea el destino al pasar el mouse. El destino aca
 * es un Route Handler que **genera un PDF y escribe la impresion**, no una
 * pantalla; prefetchearlo seria imprimir sin que nadie haya hecho clic.
 */
export function BotonDeImprimir({ id }: Props) {
  return (
    <a
      href={`/constancias/${id}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className={clasesDeBoton("primaria")}
    >
      <Printer size={18} aria-hidden="true" />
      Imprimir
    </a>
  );
}
