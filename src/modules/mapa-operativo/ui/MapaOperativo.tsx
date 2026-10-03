import Link from "next/link";
import { CLASES_DE_ENLACE, CLASES_DE_TARJETA } from "@/shared/ui";
import type { FiltrosDeMapa } from "../application";
import type { MapaOperativoAgregado } from "../domain";
import { FormularioDeFiltrosDeMapa } from "./FormularioDeFiltrosDeMapa";
import { MapaVisual } from "./MapaVisual";

type Props = { mapa: MapaOperativoAgregado; filtros: FiltrosDeMapa };
const etiquetaDe = (recurso: "REPORTE" | "INTERVENCION") =>
  recurso === "REPORTE" ? "Reporte ciudadano" : "Intervención municipal";
const conteoDe = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;
const razonDe = (
  razon: "SIN_CALLE" | "CALLE_SIN_PUNTO",
  calle: string | null,
) => (razon === "SIN_CALLE" ? "sin calle" : `calle sin punto: ${calle ?? "?"}`);

const LISTA =
  "divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo";
const FILA =
  "flex min-h-12 flex-wrap items-center gap-x-2 px-5 py-2 text-[15px]";

export function MapaOperativo({ mapa, filtros }: Props) {
  return (
    <section aria-label="Mapa operativo" className="flex flex-col gap-4">
      <FormularioDeFiltrosDeMapa {...filtros} />
      <p className="text-[15px] text-caliza-apagada">
        Ubicación aproximada de la calle
      </p>
      <p className="text-[15px] text-caliza-apagada">
        {conteoDe(mapa.conteos.reportes, "reporte", "reportes")} ·{" "}
        {conteoDe(
          mapa.conteos.intervenciones,
          "intervención",
          "intervenciones",
        )}
      </p>
      {mapa.estado === "VACIO" ? (
        <p className={`${CLASES_DE_TARJETA} text-[15px] text-caliza-apagada`}>
          No hay hechos para los filtros seleccionados.
        </p>
      ) : null}
      <MapaVisual marcadores={mapa.marcadores} />
      <ul className={LISTA} aria-label="Marcadores del mapa">
        {mapa.marcadores.map((marcador) => (
          <li key={marcador.id} className={FILA}>
            <Link href={marcador.href} className={CLASES_DE_ENLACE}>
              {etiquetaDe(marcador.recurso)}: {marcador.etiqueta}
            </Link>
            {marcador.historiaHref ? (
              <>
                {" · "}
                <Link href={marcador.historiaHref} className={CLASES_DE_ENLACE}>
                  Ver historial de calle
                </Link>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {mapa.cobertura.length > 0 ? (
        <section
          aria-label="Cobertura faltante"
          className="flex flex-col gap-3"
        >
          <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
            Cobertura faltante
          </h2>
          <ul className={LISTA}>
            {mapa.cobertura.map((entrada) => (
              <li key={entrada.id} className={FILA}>
                <Link href={entrada.href} className={CLASES_DE_ENLACE}>
                  {etiquetaDe(entrada.recurso)}: {entrada.etiqueta} (
                  {razonDe(entrada.razon, entrada.calle)})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
