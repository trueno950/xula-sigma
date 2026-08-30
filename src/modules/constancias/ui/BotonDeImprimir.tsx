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
 */
export function BotonDeImprimir({ id }: Props) {
  return (
    <a
      href={`/constancias/${id}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
    >
      Imprimir
    </a>
  );
}
