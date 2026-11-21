import {
  CLASES_DE_DATO,
  CLASES_DE_ETIQUETA,
  InsigniaDeEstado,
} from "@/shared/ui";
import type { ConjuntoDelInventario, GrupoDelInventario } from "./inventario";
import { formatearFilas } from "./mensajesDeDescarga";

/**
 * El inventario de S10 y S11: seis grupos —los mismos del panel—, cada uno
 * con sus archivos, sus filas y que lleva cada uno.
 *
 * Sin `<table>`: no es una tabla de datos que se ordene ni se compare celda a
 * celda, y en el telefono una tabla de tres columnas obliga a desplazar de
 * lado. Cada archivo es un renglon de dos lineas —nombre y filas arriba, que
 * lleva abajo—, que es lo que pide S10 en 390px.
 */
export function InventarioDeConjuntos({
  grupos,
}: {
  grupos: readonly GrupoDelInventario[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <section
          key={grupo.clave}
          aria-labelledby={`grupo-${grupo.clave}`}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              id={`grupo-${grupo.clave}`}
              className="text-[1.25rem] font-semibold leading-[1.3] tracking-[-0.01em] text-caliza-tinta"
            >
              {grupo.titulo}
            </h2>
            <p className={CLASES_DE_ETIQUETA}>
              {`${formatearFilas(grupo.archivos)} archivos · ${formatearFilas(grupo.filas)} filas`}
            </p>
          </div>
          <div className="overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo">
            <EncabezadoDelGrupo />
            <ul className="flex flex-col">
              {grupo.conjuntos.map((conjunto) => (
                <FilaDelInventario key={conjunto.archivo} conjunto={conjunto} />
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * La guia visual de las tres columnas, solo en escritorio: en el telefono el
 * renglon se explica solo y un encabezado de 40px mas por grupo es ruido.
 * `aria-hidden` porque el nombre de la columna ya lo dice cada renglon.
 */
const EncabezadoDelGrupo = () => (
  <div
    aria-hidden="true"
    className="hidden h-10 items-center gap-4 border-b border-caliza-divisor bg-caliza-superficie px-4 sm:grid sm:grid-cols-[240px_96px_minmax(0,1fr)]"
  >
    <span className={CLASES_DE_ETIQUETA}>Archivo</span>
    <span className={`${CLASES_DE_ETIQUETA} text-right`}>Filas</span>
    <span className={CLASES_DE_ETIQUETA}>Qué lleva</span>
  </div>
);

function FilaDelInventario({ conjunto }: { conjunto: ConjuntoDelInventario }) {
  return (
    <li
      data-archivo={conjunto.archivo}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 border-b border-caliza-divisor px-4 py-3 last:border-b-0 sm:grid-cols-[240px_96px_minmax(0,1fr)] sm:items-center sm:gap-x-4"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className={`${CLASES_DE_DATO} font-semibold text-caliza-tinta`}>
          {conjunto.archivo}
        </span>
        {conjunto.llevaDatosDelPersonal ? (
          <InsigniaDeEstado tono="aviso" etiqueta="datos del personal" />
        ) : null}
      </span>
      <span
        className={`${CLASES_DE_DATO} justify-self-end text-right font-semibold`}
      >
        <span className="sr-only">Filas: </span>
        {formatearFilas(conjunto.filas)}
      </span>
      <span className="col-span-2 text-[13px] leading-[1.4] text-caliza-apagada sm:col-span-1 sm:text-[15px]">
        {conjunto.lleva}
      </span>
    </li>
  );
}
