import { CLASES_DE_TARJETA } from "@/shared/ui";
import type { LeyendaDelMapa as Leyenda } from "../domain";
import { etiquetaDeRecurso } from "./etiquetasDeRecurso";
import { IconoDeMapa } from "./IconoDeMapa";

const RENGLON = "flex items-center gap-2 text-[15px] text-caliza-tinta";
const TITULO = "text-[15px] font-semibold tracking-[-0.01em] text-caliza-tinta";

/**
 * S3: la leyenda es HTML del servidor -sin JavaScript se ve igual-, y sus
 * colores son los que decidio `domain/coloresDeEstado.ts`, no una paleta del
 * cliente: la muestra es el color que va a tener el pin en el mapa.
 */
export function LeyendaDelMapa({ leyenda }: { leyenda: Leyenda }) {
  if (leyenda.tipos.length === 0 && leyenda.estados.length === 0) return null;

  return (
    <section
      aria-label="Leyenda del mapa"
      className={`grid gap-4 sm:grid-cols-2 ${CLASES_DE_TARJETA}`}
    >
      {leyenda.tipos.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className={TITULO}>Por tipo</h2>
          <ul aria-label="Conteo por tipo" className="flex flex-col gap-1">
            {leyenda.tipos.map((entrada) => (
              <li
                key={`${entrada.recurso}:${entrada.tipo}`}
                className={RENGLON}
              >
                <IconoDeMapa clave={entrada.icono} />
                <span>
                  {entrada.etiqueta} (
                  {etiquetaDeRecurso(entrada.recurso, "leyenda")})
                </span>{" "}
                <span className="ml-auto font-semibold">{entrada.conteo}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {leyenda.estados.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className={TITULO}>Por estado</h2>
          <ul aria-label="Conteo por estado" className="flex flex-col gap-1">
            {leyenda.estados.map((entrada) => (
              <li key={entrada.estado} className={RENGLON}>
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: entrada.color }}
                />{" "}
                <span>{entrada.etiqueta}</span>{" "}
                <span className="ml-auto font-semibold">{entrada.conteo}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
