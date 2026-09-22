import Link from "next/link";
import type { MapaOperativoAgregado } from "../domain";

type Props = { mapa: MapaOperativoAgregado };
const etiquetaDe = (recurso: "REPORTE" | "INTERVENCION") =>
  recurso === "REPORTE" ? "Reporte ciudadano" : "Intervencion municipal";

export function MapaOperativo({ mapa }: Props) {
  return (
    <section aria-label="Mapa operativo" className="flex flex-col gap-4">
      <p className="text-[15px] text-caliza-apagada">
        Ubicacion aproximada de la calle
      </p>
      <p className="text-[15px] text-caliza-apagada">
        {mapa.conteos.reportes} reportes · {mapa.conteos.intervenciones}{" "}
        intervenciones
      </p>
      {mapa.estado === "VACIO" ? (
        <p>No hay hechos para los filtros seleccionados.</p>
      ) : null}
      <ul className="flex flex-col gap-2" aria-label="Marcadores del mapa">
        {mapa.marcadores.map((marcador) => (
          <li key={marcador.id}>
            <Link href={marcador.href}>
              {etiquetaDe(marcador.recurso)}: {marcador.etiqueta}
            </Link>
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
                  {entrada.razon === "SIN_CALLE"
                    ? "sin calle"
                    : "calle sin punto"}
                  )
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
