import { CLASES_DE_TARJETA } from "@/shared/ui";
import {
  type ConteosDeReportes as Conteos,
  ESTADOS_DE_REPORTE,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  SIN_AREA,
} from "../domain";

const COLUMNA = "flex flex-col gap-2";
const TITULO = "text-[15px] font-semibold tracking-[-0.01em] text-caliza-tinta";
const RENGLON = "flex items-center gap-2 text-[15px] text-caliza-tinta";

/**
 * Los conteos de S2: por estado y por area responsable, para los filtros
 * elegidos. Es HTML del servidor -sin JavaScript se lee igual-, y los numeros
 * los contó Postgres con esos mismos filtros, no la pagina visible: la
 * bandeja viene paginada y sumar las filas de la pagina daria el conteo de
 * cincuenta filas, no el del municipio.
 *
 * Los cuatro estados se muestran siempre -un cero es informacion- y las areas
 * solo cuando tienen algo: seis renglones en cero son ruido. El espacio entre
 * la etiqueta y el numero es texto, no `gap`: sin el, el lector de pantalla
 * lee "Recibido3".
 */
export function ConteosDeReportes({ conteos }: { conteos: Conteos }) {
  return (
    <section
      aria-label="Conteos de reportes"
      className={`grid gap-4 sm:grid-cols-3 ${CLASES_DE_TARJETA}`}
    >
      <div className={COLUMNA}>
        <h2 className={TITULO}>Total</h2>
        <p className="text-[1.5rem] leading-none font-semibold tabular-nums text-caliza-tinta">
          {conteos.total}
        </p>
      </div>

      <div className={COLUMNA}>
        <h2 className={TITULO}>Por estado</h2>
        <ul aria-label="Conteo por estado" className="flex flex-col gap-1">
          {ESTADOS_DE_REPORTE.map((estado) => (
            <li key={estado} className={RENGLON}>
              <span>{ETIQUETA_DE_ESTADO_DE_REPORTE[estado]}</span>{" "}
              <span className="ml-auto font-semibold tabular-nums">
                {conteos.porEstado[estado]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {conteos.porArea.length > 0 ? (
        <div className={COLUMNA}>
          <h2 className={TITULO}>Por área</h2>
          <ul aria-label="Conteo por área" className="flex flex-col gap-1">
            {conteos.porArea.map((fila) => (
              <li key={fila.area ?? "sin-area"} className={RENGLON}>
                <span>
                  {fila.area === null ? SIN_AREA : ETIQUETA_DE_AREA[fila.area]}
                </span>{" "}
                <span className="ml-auto font-semibold tabular-nums">
                  {fila.conteo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
