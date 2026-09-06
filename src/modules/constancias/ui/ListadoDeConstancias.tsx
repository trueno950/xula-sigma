import { fechaEnMerida } from "@/shared/lib/fecha";
import {
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  type EstadoDeLista,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type {
  ConstanciaGuardada,
  FiltrosDeListado,
} from "../application/puertos";
import type { OrdenDeConstancias } from "../domain";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";
import { FiltrosDeConstancias } from "./FiltrosDeConstancias";
import { hrefDeVerMas } from "./hrefsDeListado";

type Props = {
  constancias: readonly ConstanciaGuardada[];
  hayMas: boolean;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeListado;
  q?: string | undefined;
  orden?: OrdenDeConstancias | undefined;
  limite?: number | undefined;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,2fr)" },
  { clave: "emitida", etiqueta: "Emitida", ancho: "minmax(0,1fr)" },
];

/**
 * Listado con busqueda (`?q=`), filtro por `estado` (con su chip),
 * paginacion (`?limite=`) y orden (`?ordenar=&direccion=`) -las cuatro
 * secciones de `design.md` que esta rebanada agrega sobre el listado
 * simple original. Mismo molde que `reportes/ui/ListadoDeReportes.tsx`.
 *
 * La etiqueta roja "Cancelada" en la celda del folio es la senal de que
 * *esta fila* esta cancelada; el chip de filtro dice que *el listado* esta
 * filtrado por estado. Las dos conviven porque responden preguntas
 * distintas.
 */
export function ListadoDeConstancias({
  constancias,
  hayMas,
  estadoDeLista: estado,
  filtros,
  q,
  orden,
  limite,
}: Props) {
  const columnas = resolverOrdenDeColumnas(COLUMNAS, { orden, filtros, q });

  return (
    <div className="flex flex-col gap-4">
      <FiltrosDeConstancias {...filtros} q={q} />

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavia no hay constancias emitidas. Se emiten desde la ficha de la persona, en el padron."
          hrefSinFiltro="/constancias"
          accion={<EnlaceDeAccion href="/padron">Ir al padron</EnlaceDeAccion>}
        />
      ) : (
        <Tabla
          etiqueta="Constancias emitidas"
          columnas={columnas}
          {...(hayMas
            ? { verMas: hrefDeVerMas({ filtros, q, limite, orden }) }
            : {})}
        >
          {constancias.map((constancia) => (
            <FilaDeTabla
              key={constancia.id}
              href={`/constancias/${constancia.id}`}
            >
              <CeldaPrincipal>
                <span className="font-mono">{constancia.folio}</span>
                {constancia.canceladaEn ? (
                  <span className="ml-2 font-sans text-[13px] font-normal text-senial-error">
                    Cancelada
                  </span>
                ) : null}
              </CeldaPrincipal>
              <CeldaDeDato>{fechaEnMerida(constancia.emitidaEn)}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </div>
  );
}
