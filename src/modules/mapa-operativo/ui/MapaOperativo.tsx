import Link from "next/link";
import { Aviso, CLASES_DE_ENLACE, CLASES_DE_TARJETA } from "@/shared/ui";
import type { FiltrosDeMapa } from "../application";
import type { MapaOperativoAgregado, TerritorioDeMapa } from "../domain";
import { etiquetaDeRecurso } from "./etiquetasDeRecurso";
import { FormularioDeFiltrosDeMapa } from "./FormularioDeFiltrosDeMapa";
import { LeyendaDelMapa } from "./LeyendaDelMapa";
import { ListaDeMarcadores } from "./ListaDeMarcadores";
import { MapaVisual } from "./MapaVisual";

type Props = { mapa: MapaOperativoAgregado; filtros: FiltrosDeMapa };
const conteoDe = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;
const razonDe = (
  razon: "SIN_CALLE" | "CALLE_SIN_PUNTO",
  calle: string | null,
) => (razon === "SIN_CALLE" ? "sin calle" : `calle sin punto: ${calle ?? "?"}`);

/**
 * El aviso de S2: un territorio sin calles ubicadas no tiene caja que
 * bloquear, asi que el mapa vuelve a la vista de Yucatan. Se dice, no se
 * inventa un centro.
 */
export const mensajeSinCalles = (territorio: TerritorioDeMapa | null) =>
  `Sin calles ubicadas en ${territorio?.nombre ?? "el municipio"}. El mapa muestra todo Yucatán.`;

const LISTA =
  "divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo";
const FILA =
  "flex min-h-12 flex-wrap items-center gap-x-2 px-5 py-2 text-[15px]";

export function MapaOperativo({ mapa, filtros }: Props) {
  return (
    <section aria-label="Mapa operativo" className="flex flex-col gap-4">
      <FormularioDeFiltrosDeMapa {...filtros} territorios={mapa.territorios} />
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
      <LeyendaDelMapa leyenda={mapa.leyenda} />
      {mapa.caja === null ? (
        <Aviso tono="aviso">{mensajeSinCalles(mapa.territorioElegido)}</Aviso>
      ) : null}
      <MapaVisual marcadores={mapa.marcadores} caja={mapa.caja} />
      <ListaDeMarcadores marcadores={mapa.marcadores} />
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
                  {etiquetaDeRecurso(entrada.recurso, "lista")}:{" "}
                  {entrada.etiqueta} ({razonDe(entrada.razon, entrada.calle)})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
