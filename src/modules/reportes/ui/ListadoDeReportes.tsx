import type { Rol } from "@/shared/auth/roles";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import { fechaEnMerida } from "@/shared/lib/fecha";
import {
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  type EstadoDeLista,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { FiltrosDeListado, ReporteGuardado } from "../application/puertos";
import type { OrdenDeReportes } from "../domain";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";
import { ESTADOS_LEGIBLES, textoDeArea } from "./estadosLegibles";
import { FiltrosDeReportes } from "./FiltrosDeReportes";
import { hrefDeVerMas } from "./hrefsDeListado";

type Props = {
  reportes: readonly ReporteGuardado[];
  hayMas: boolean;
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeListado;
  q?: string | undefined;
  orden?: OrdenDeReportes | undefined;
  limite?: number | undefined;
  rol: Rol;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,2fr)" },
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,1fr)" },
  { clave: "estado", etiqueta: "Estado", ancho: "minmax(0,1fr)" },
  { clave: "area", etiqueta: "Area", ancho: "minmax(0,1fr)" },
  { clave: "registrado", etiqueta: "Registrado", ancho: "minmax(0,1fr)" },
];

/**
 * Listado con busqueda (`?q=`), filtros por `estado`/`tipo` (con su chip),
 * paginacion (`?limite=`) y orden (`?ordenar=&direccion=`) -las cuatro
 * secciones de `design.md` que esta rebanada agrega sobre el listado con
 * solo filtros de la Fase 4. El area solo se lee como "Sin asignar" para
 * quien puede asignarla (`puedeAdministrarReportes`, design.md seccion
 * 12): ocultar esa lectura no es autorizacion -la guarda real vive en
 * `asignarAreaDeReporte`-, solo evita mostrarle a quien no puede actuar
 * una llamada a hacerlo.
 */
export function ListadoDeReportes({
  reportes,
  hayMas,
  estadoDeLista: estado,
  filtros,
  q,
  orden,
  limite,
  rol,
}: Props) {
  const puedeAdministrar = puedeAdministrarReportes(rol);
  const columnas = resolverOrdenDeColumnas(COLUMNAS, { orden, filtros, q });

  return (
    <div className="flex flex-col gap-4">
      <FiltrosDeReportes {...filtros} q={q} />

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavia no hay reportes registrados."
          hrefSinFiltro="/reportes"
        />
      ) : (
        <Tabla
          etiqueta="Reportes ciudadanos"
          columnas={columnas}
          {...(hayMas
            ? { verMas: hrefDeVerMas({ filtros, q, limite, orden }) }
            : {})}
        >
          {reportes.map((reporte) => (
            <FilaDeTabla
              key={reporte.id}
              href={`/reportes/detalle/${reporte.id}`}
            >
              <CeldaPrincipal>{reporte.folio}</CeldaPrincipal>
              <CeldaDeDato>{reporte.tipo}</CeldaDeDato>
              <CeldaDeDato>{ESTADOS_LEGIBLES[reporte.estado]}</CeldaDeDato>
              <CeldaDeDato>
                {textoDeArea(reporte.areaResponsable, puedeAdministrar)}
              </CeldaDeDato>
              <CeldaDeDato>{fechaEnMerida(reporte.registradoEn)}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </div>
  );
}
