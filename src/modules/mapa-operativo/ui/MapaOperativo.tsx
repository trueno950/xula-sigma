import Link from "next/link";
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
          "intervencion",
          "intervenciones",
        )}
      </p>
      {mapa.estado === "VACIO" ? (
        <p>No hay hechos para los filtros seleccionados.</p>
      ) : null}
      <MapaVisual marcadores={mapa.marcadores} />
      <ul className="flex flex-col gap-2" aria-label="Marcadores del mapa">
        {mapa.marcadores.map((marcador) => (
          <li key={marcador.id}>
            <Link href={marcador.href}>
              {etiquetaDe(marcador.recurso)}: {marcador.etiqueta}
            </Link>
            {marcador.historiaHref ? (
              <>
                {" · "}
                <Link href={marcador.historiaHref}>Ver historial de calle</Link>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {mapa.cobertura.length > 0 ? (
        <section aria-label="Cobertura faltante">
          <h2 className="text-[15px] font-semibold text-caliza-tinta">
            Cobertura faltante
          </h2>
          <ul>
            {mapa.cobertura.map((entrada) => (
              <li key={entrada.id}>
                <Link href={entrada.href}>
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
