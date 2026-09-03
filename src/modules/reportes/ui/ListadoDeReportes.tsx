import type { Rol } from "@/shared/auth/roles";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import { fechaEnMerida } from "@/shared/lib/fecha";
import {
  Boton,
  CampoDeLista,
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  type EstadoDeLista,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { FiltrosDeListado, ReporteGuardado } from "../application/puertos";
import {
  type AreaResponsable,
  ESTADOS_DE_REPORTE,
  type EstadoDeReporte,
  TIPOS_DE_INCIDENCIA,
} from "../domain";
import { opcionesDeCatalogo } from "./opciones";

type Props = {
  reportes: readonly ReporteGuardado[];
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeListado;
  rol: Rol;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,2fr)" },
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,1fr)" },
  { clave: "estado", etiqueta: "Estado", ancho: "minmax(0,1fr)" },
  { clave: "area", etiqueta: "Area", ancho: "minmax(0,1fr)" },
  { clave: "registrado", etiqueta: "Registrado", ancho: "minmax(0,1fr)" },
];

const ESTADOS_LEGIBLES: Record<EstadoDeReporte, string> = {
  RECIBIDO: "Recibido",
  EN_ATENCION: "En atencion",
  RESUELTO: "Resuelto",
  RECHAZADO: "Rechazado",
};

/** "Sin asignar" solo tiene sentido para quien puede asignar (decision 6). */
const textoDeArea = (
  area: AreaResponsable | null,
  puedeAdministrar: boolean,
): string => {
  if (area) return area;
  return puedeAdministrar ? "Sin asignar" : "—";
};

/**
 * `<form method="get">` nativo, mismo criterio que `BuscadorDePersonas`:
 * filtrar es una lectura, y una lectura ya tiene URL propia -`?estado=` y
 * `?tipo=`-, sin Server Action ni JavaScript.
 */
function FiltrosDeReportes({ estado, tipo }: FiltrosDeListado) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <CampoDeLista
        id="filtro-estado"
        name="estado"
        etiqueta="Estado"
        marcador="Todos"
        opcional
        defaultValue={estado ?? ""}
        opciones={opcionesDeCatalogo(ESTADOS_DE_REPORTE)}
      />
      <CampoDeLista
        id="filtro-tipo"
        name="tipo"
        etiqueta="Tipo"
        marcador="Todos"
        opcional
        defaultValue={tipo ?? ""}
        opciones={opcionesDeCatalogo(TIPOS_DE_INCIDENCIA)}
      />
      <Boton type="submit" variante="secundaria">
        Filtrar
      </Boton>
    </form>
  );
}

/**
 * Listado con filtros por `estado`/`tipo` (tasks.md 7.5). El area solo se
 * lee como "Sin asignar" para quien puede asignarla
 * (`puedeAdministrarReportes`, design.md seccion 12): ocultar esa lectura no
 * es autorizacion -la guarda real vive en `asignarAreaDeReporte`, Fase 5-,
 * solo evita mostrarle a quien no puede actuar una llamada a hacerlo.
 */
export function ListadoDeReportes({
  reportes,
  estadoDeLista: estado,
  filtros,
  rol,
}: Props) {
  const puedeAdministrar = puedeAdministrarReportes(rol);

  return (
    <div className="flex flex-col gap-4">
      <FiltrosDeReportes {...filtros} />

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavia no hay reportes registrados."
          hrefSinFiltro="/reportes"
        />
      ) : (
        <Tabla etiqueta="Reportes ciudadanos" columnas={COLUMNAS}>
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
