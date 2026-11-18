import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  AreaResponsable,
  EstadoDeReporte,
  MotivoDeRechazo,
  ReporteId,
  TipoDeIncidencia,
} from "../domain";
import type {
  DatosDeRegistroDeReporte,
  ReporteGuardado,
} from "./puertosDeFilas";
import type {
  ConteosCrudos,
  FiltrosDeListado,
  OpcionesDeBusqueda,
  OpcionesDeConteo,
  OpcionesDeListado,
} from "./puertosDeListado";
import type { ReporteDeBandeja } from "./puertosDeUbicacionesDeReporte";

/**
 * Las dos formas de una fila -lo que se guarda y lo que se lee- viven en
 * `puertosDeFilas.ts` por la metrica de lineas por archivo; se re-exportan
 * aca para que `import { ... } from "./puertos"` siga funcionando.
 */
export type {
  DatosDeRegistroDeReporte,
  ReporteGuardado,
} from "./puertosDeFilas";

/** Lo minimo del candidato a original: un salto, no la fila entera (design.md seccion 8). */
export type CandidatoAOriginal = {
  id: ReporteId;
  duplicadoDeReporteId: string | null;
};

/** Lo que lee `paraConsultaPublica` para la superficie publica (design.md seccion 14). */
export type FilaParaConsultaPublica = {
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  registradoEn: Date;
  actualizadoEn: Date;
  duplicadoDeReporteId: string | null;
};

/** Lo que devuelve `similaresAbiertos` al alta (design.md seccion 13). */
export type ReporteSimilar = {
  id: ReporteId;
  folio: string;
  estado: EstadoDeReporte;
  descripcion: string;
  registradoEn: Date;
};

/**
 * `FiltrosDeListado`, `OpcionesDeListado`, `OpcionesDeBusqueda` y `ConteosCrudos` viven en
 * `puertosDeListado.ts` -tema propio, mismo criterio que
 * `puertosDeMovimientos.ts`- pero se re-exportan aca para que
 * `import { ... } from "./puertos"` siga funcionando.
 */
export type {
  FiltrosDeLaBandeja,
  FiltrosDeListado,
  OpcionesDeBusqueda,
  OpcionesDeConteo,
  OpcionesDeListado,
} from "./puertosDeListado";

/**
 * Lo que `listarReportes`/`buscarReportes` devuelven a la pantalla:
 * `reportes` ya recortado a la pagina pedida, y `hayMas` -de
 * `resolverPagina`- para que `ListadoDeReportes` sepa si pintar "Ver mas".
 * Se queda aca -y no en `puertosDeListado.ts`- porque depende de
 * `ReporteGuardado`, definido arriba en este mismo archivo.
 */
export type ResultadoDeListado = {
  /** Cada fila ya trae donde ocurrio (S4 de `reportes-ux`): `puertosDeUbicacionesDeReporte.ts`. */
  readonly reportes: readonly ReporteDeBandeja[];
  readonly hayMas: boolean;
};

/**
 * Puerto de escritura y lectura de `reportes`. Cada operacion recibe la
 * transaccion de `withTenant` por parametro y no la abre ella misma (mismo
 * criterio que `RepositorioDeConstancias`). El contrato se declara completo
 * aca aunque `cambiarEstadoDeReporte` (Fase 5) y `buscarReportesSimilares`
 * (Fase 7) sean quienes invoquen `candidatoAOriginalPorFolio`/`aplicarTransicion`/
 * `asignarArea`/`similaresAbiertos`/`contarDuplicadosDe`/
 * `paraConsultaPublica*`; `repositorioDeReportesSql` los completa en esas
 * rebanadas sobre el mismo archivo (tasks.md 4.7).
 */
export type RepositorioDeReportes = {
  guardar(
    tx: TransaccionTenant,
    datos: DatosDeRegistroDeReporte,
  ): Promise<void>;
  buscarPorId(
    tx: TransaccionTenant,
    id: ReporteId,
  ): Promise<ReporteGuardado | null>;
  /** `folio` es el impreso: el unico identificador que el operador ve y teclea. */
  candidatoAOriginalPorFolio(
    tx: TransaccionTenant,
    folio: string,
  ): Promise<CandidatoAOriginal | null>;
  /** `false` cuando afecta cero filas: otra transaccion lo movio en el medio (design.md seccion 12). */
  aplicarTransicion(
    tx: TransaccionTenant,
    datos: {
      id: ReporteId;
      estadoAnterior: EstadoDeReporte;
      estadoNuevo: EstadoDeReporte;
      motivoDeRechazo: MotivoDeRechazo | null;
      duplicadoDeReporteId: string | null;
    },
  ): Promise<boolean>;
  asignarArea(
    tx: TransaccionTenant,
    datos: { id: ReporteId; areaResponsable: AreaResponsable },
  ): Promise<boolean>;
  /**
   * `opciones.limite` es el `LIMIT` de Postgres tal cual -sin `OFFSET`:
   * "Ver mas" crece el limite, no pagina por indice (`design.md`,
   * "Paginacion")-, y `opciones.orden` cambia el `ORDER BY`; sin orden,
   * sigue el default del metodo (`registradoEn DESC`, design.md seccion
   * 10).
   */
  listar(
    tx: TransaccionTenant,
    filtros: FiltrosDeListado,
    opciones: OpcionesDeListado,
  ): Promise<readonly ReporteGuardado[]>;
  /**
   * Texto libre sobre `folio`/`descripcion`/`referencia` con `ILIKE`
   * (`design.md`, "Buscador"). `opciones.filtros` convive con la busqueda
   * -"nunca los reemplaza"-, mismo `estado`/`tipo` que `listar`. Sin
   * infraestructura de trigramas propia: a diferencia de `padron`, esta
   * rebanada no monto un indice GIN para `reportes`, asi que `ILIKE` sobre
   * las tres columnas alcanza (tasks.md, esta rebanada).
   */
  buscar(
    tx: TransaccionTenant,
    cadena: string,
    opciones: OpcionesDeBusqueda,
  ): Promise<readonly ReporteGuardado[]>;
  /**
   * Los conteos de S2 en dos `GROUP BY`, con los mismos filtros y la misma
   * busqueda que `listar`/`buscar`: los numeros de la pantalla tienen que
   * corresponder a las filas que se ven.
   */
  contar(
    tx: TransaccionTenant,
    opciones: OpcionesDeConteo,
  ): Promise<ConteosCrudos>;
  similaresAbiertos(
    tx: TransaccionTenant,
    criterio: { lugarId: string; tipo: TipoDeIncidencia },
  ): Promise<readonly ReporteSimilar[]>;
  contarDuplicadosDe(tx: TransaccionTenant, id: ReporteId): Promise<number>;
  paraConsultaPublica(
    tx: TransaccionTenant,
    folio: string,
  ): Promise<FilaParaConsultaPublica | null>;
  paraConsultaPublicaPorId(
    tx: TransaccionTenant,
    id: string,
  ): Promise<FilaParaConsultaPublica | null>;
};

/**
 * `ContadorDeFolios` y el historial de movimientos (`DatosDeMovimiento`,
 * `MovimientoGuardado`, `RegistroDeMovimientos`) viven en
 * `puertosDeMovimientos.ts` -tema propio, otro regimen de permisos, otra
 * tabla- y se importan de ahi directo: metrica de lineas por archivo
 * (`AGENTS.md`), sin este archivo de por medio.
 */
