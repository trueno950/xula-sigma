import { CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { LeyendaDelMapa as Leyenda } from "../domain";
import { IconoDeMapa } from "./IconoDeMapa";
import { PliegueDeLeyenda } from "./PliegueDeLeyenda";

/** La capa flotante sobre el mapa: 296px, como la leyenda del tablero. */
/**
 * `z-[1000]` y no el orden natural del documento: los panes de Leaflet llevan
 * `z-index` 400 y los controles 1000, y un posicionado sin `z-index` se pinta
 * debajo de los dos. Medido: sin esta clase la capa estaba en el DOM, el
 * `elementFromPoint` la encontraba y los tiles la tapaban igual. Empata con
 * los controles y gana por orden del documento -va despues del mapa-, y no se
 * cruza con ellos porque viven en esquinas distintas.
 */
const CAPA =
  "pointer-events-auto absolute bottom-3 left-3 z-[1000] w-[296px] max-w-[calc(100%-1.5rem)]";
const RENGLON = "flex items-center gap-1.5 text-[13px] text-caliza-tinta";
const CUENTA = "ml-auto font-mono font-semibold tabular-nums";
const GRUPO = "flex flex-col gap-1";

const conteoDeHechos = (total: number) =>
  `${total} ${total === 1 ? "hecho" : "hechos"}`;

/**
 * S3: la leyenda vive dentro del mapa, como una capa compacta y plegable
 * (`PliegueDeLeyenda` decide cuando abre). Es HTML del servidor -sin JavaScript se lee igual- y
 * sus colores son los que decidio `domain/coloresDeEstado.ts`, no una paleta
 * del cliente: la muestra es el color que tiene el pin.
 *
 * El renglon de atrasados solo aparece cuando hay alguno: es la unica senal
 * de la leyenda que no es un tipo ni un estado, y un cero permanente se lee
 * como una alarma que nunca suena. Lo fija el spec de `mapa-operativo`.
 */
export function LeyendaDelMapa({ leyenda }: { leyenda: Leyenda }) {
  if (leyenda.tipos.length === 0 && leyenda.estados.length === 0) return null;

  return (
    <section aria-label="Leyenda del mapa" className={CAPA}>
      <PliegueDeLeyenda>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[15px] font-semibold text-caliza-tinta">
          Leyenda
          <span className="ml-auto font-mono text-[14px] tabular-nums text-caliza-apagada">
            {conteoDeHechos(leyenda.total)}
          </span>
        </summary>
        <div className="flex flex-col gap-2 px-4 pb-3">
          {leyenda.tipos.length > 0 ? (
            <div className={GRUPO}>
              <p className={CLASES_DE_ETIQUETA}>Por tipo</p>
              <ul
                aria-label="Conteo por tipo"
                className="grid grid-cols-2 gap-x-3"
              >
                {leyenda.tipos.map((entrada) => (
                  <li
                    key={`${entrada.recurso}:${entrada.tipo}`}
                    className={RENGLON}
                  >
                    <IconoDeMapa clave={entrada.icono} tamano={14} />
                    <span>{entrada.etiqueta}</span>
                    <span className={CUENTA}>{entrada.conteo}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {leyenda.estados.length > 0 ? (
            <div className={GRUPO}>
              <p className={CLASES_DE_ETIQUETA}>Por estado</p>
              <ul aria-label="Conteo por estado" className={GRUPO}>
                {leyenda.estados.map((entrada) => (
                  <li key={entrada.estado} className={RENGLON}>
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-pill"
                      style={{ background: entrada.color }}
                    />
                    <span>{entrada.etiqueta}</span>
                    <span className={CUENTA}>{entrada.conteo}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {leyenda.atrasados > 0 ? (
            <div className={GRUPO}>
              <p className={CLASES_DE_ETIQUETA}>Atrasados</p>
              <ul aria-label="Conteo de atrasados" className={GRUPO}>
                <li className={RENGLON}>
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-pill ring-2 ring-senial-error"
                  />
                  <span>Atrasados</span>
                  <span className={CUENTA}>{leyenda.atrasados}</span>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </PliegueDeLeyenda>
    </section>
  );
}
