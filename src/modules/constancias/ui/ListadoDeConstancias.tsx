import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  type ColumnaDeTabla,
  clasesDeBoton,
  EstadoVacio,
  estadoDeLista,
  Tabla,
} from "@/shared/ui";
import type {
  ConstanciaGuardada,
  FiltrosDeListado,
} from "../application/puertos";
import type { OrdenDeConstancias } from "../domain";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";
import { descripcionDeFiltrosDeConstancias } from "./descripcionDeFiltros";
import { FilaDeConstancia } from "./FilaDeConstancia";
import { FiltrosDeConstancias } from "./FiltrosDeConstancias";
import { hrefDeVerMas } from "./hrefsDeListado";
import { PieDeConstancias, ResumenDeConstancias } from "./ResumenDeConstancias";

type Props = {
  constancias: readonly ConstanciaGuardada[];
  /** De `resolverPagina`: si hay una pagina siguiente que pintar. */
  hayMas: boolean;
  filtros: FiltrosDeListado;
  /** El `?q=` que produjo esta lista, si lo hubo. Distingue los dos vacios. */
  q?: string | undefined;
  orden?: OrdenDeConstancias | undefined;
  limite?: number | undefined;
  /** El boton que llena la pantalla cuando todavia no se emitio nada. */
  accionDeEmision?: ReactNode;
};

/**
 * Solo `folio` y `emitida` pasan por el estado de `@tanstack/table-core`:
 * son las dos columnas con orden natural (`domain/ordenDeConstancias.ts`).
 * El titular no se ordena porque el `ORDER BY` del repositorio no lo
 * conoce, y prometer un encabezado clicable que no reordena seria peor que
 * no ofrecerlo.
 */
const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,10rem)" },
  { clave: "titular", etiqueta: "Titular", ancho: "minmax(0,2fr)" },
  { clave: "estado", etiqueta: "Estado", ancho: "minmax(0,9rem)" },
  { clave: "emitida", etiqueta: "Emitida", ancho: "minmax(0,8rem)" },
];

/**
 * El vacio por filtro de S2. No usa `shared/ui/EstadoVacio` porque ese
 * rotula su boton «Quitar el filtro», y el vacio de una busqueda ofrece
 * «Quitar búsqueda» -el texto que aprobo la auditoria-, para nombrar lo que
 * de verdad se quita.
 */
function VacioPorFiltro({
  filtro,
  porBusqueda,
}: {
  filtro: string;
  porBusqueda: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-caliza-divisor bg-caliza-lienzo px-6 py-12 text-center shadow-reposo">
      <MagnifyingGlass
        size={40}
        weight="light"
        aria-hidden="true"
        className="text-caliza-apagada"
      />
      <p className="text-[15px] text-caliza-tinta">
        Sin resultados para <span className="font-semibold">{filtro}</span>.
      </p>
      <Link href="/constancias" className={clasesDeBoton("secundaria")}>
        {porBusqueda ? "Quitar búsqueda" : "Quitar el filtro"}
      </Link>
    </div>
  );
}

/**
 * El listado de `constancias-ux` en la direccion de
 * `design/constancias-listado/01-tabla-con-titular.html`: el buscador
 * etiquetado con su ayuda, la linea de resultado con los chips de lo puesto,
 * la tabla con el titular de cada constancia y el pie con lo que se esta
 * viendo.
 *
 * Los dos vacios son distintos y por eso recibe `q` -ver
 * `shared/ui/estadoDeLista.ts`-: sin constancias, la pantalla dice que es y
 * ofrece la primera emision; con una busqueda que no encontro, nombra la
 * busqueda y ofrece quitarla.
 */
export function ListadoDeConstancias({
  constancias,
  hayMas,
  filtros,
  q,
  orden,
  limite,
  accionDeEmision,
}: Props) {
  const estado = estadoDeLista({
    total: constancias.length,
    filtro: descripcionDeFiltrosDeConstancias(filtros, q),
  });

  if (estado.clase === "vacio-inicial") {
    return (
      <EstadoVacio
        estado={estado}
        mensajeInicial="Todavía no hay constancias emitidas."
        hrefSinFiltro="/constancias"
        {...(accionDeEmision ? { accion: accionDeEmision } : {})}
      />
    );
  }

  if (estado.clase === "vacio-por-filtro") {
    return (
      <div className="flex flex-col gap-4">
        <FiltrosDeConstancias {...filtros} q={q} />
        <ResumenDeConstancias
          total={constancias.length}
          filtros={filtros}
          q={q}
          orden={orden}
        />
        <VacioPorFiltro filtro={estado.filtro} porBusqueda={Boolean(q)} />
      </div>
    );
  }

  const columnas = resolverOrdenDeColumnas(COLUMNAS, { orden, filtros, q });

  return (
    <div className="flex flex-col gap-4">
      <FiltrosDeConstancias {...filtros} q={q} />
      <ResumenDeConstancias
        total={constancias.length}
        filtros={filtros}
        q={q}
        orden={orden}
      />
      <Tabla
        etiqueta="Constancias emitidas"
        columnas={columnas}
        {...(hayMas
          ? { verMas: hrefDeVerMas({ filtros, q, limite, orden }) }
          : {})}
      >
        {constancias.map((constancia) => (
          <FilaDeConstancia key={constancia.id} constancia={constancia} />
        ))}
      </Tabla>
      <PieDeConstancias total={constancias.length} hayMas={hayMas} />
    </div>
  );
}
