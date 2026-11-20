import type { ContextoActual } from "@/shared/auth/contexto";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  EstadoDeIntervencion,
  FilaDeConteoDeIntervencion,
  IntervencionId,
  TipoDeIntervencion,
} from "../domain";
import type { IntervencionGuardada } from "./puertos";

/**
 * El veredicto de `calleDelLugar`, el mismo de `territorio` escrito aca para
 * que la capa de aplicacion no importe el dominio del otro modulo: el
 * adaptador traduce en la unica frontera.
 */
export type CalleEnElLugar = "del-lugar" | "fuera-del-lugar" | "no-resuelve";

export type LecturaDeUbicaciones = {
  de(
    tx: TransaccionTenant,
    lugarId: string,
    calleId: string | null,
  ): Promise<{ texto: string } | null>;
  /**
   * Si la calle cuelga del asentamiento del lugar (S6 de
   * `intervenciones-ux`). `de` no puede responderlo: resuelve cualquier pareja
   * de filas guardadas, incluida una que dejo de ser coherente cuando se
   * reparento el lugar.
   *
   * Opcional en el tipo y obligatoria en la practica -el adaptador real la
   * implementa-: un lector que solo compone el texto no puede aceptar una
   * calle, y los casos de uso la tratan como "no resuelve" cuando falta. Nunca
   * se escribe una calle a ciegas.
   */
  calleDelLugar?(
    tx: TransaccionTenant,
    lugarId: string,
    calleId: string,
  ): Promise<CalleEnElLugar>;
};

export type LecturaDeReportes = {
  porId(tx: TransaccionTenant, reporteId: string): Promise<boolean>;
};

export type IntervencionParaMapa = {
  id: IntervencionId;
  tipo: TipoDeIntervencion;
  estado: EstadoDeIntervencion;
  calleId: string | null;
  lugarId: string;
  /**
   * La fecha del hecho, civil (`YYYY-MM-DD`): S4 de `gestion-municipal` pide
   * la fecha en la ventana de cada marcador, y para una obra esa fecha es la
   * de ocurrencia, no la de captura.
   */
  fechaDeOcurrencia: string;
};

export type LectorDeIntervencionesDeMapa = {
  listarParaMapa(
    tx: TransaccionTenant,
  ): Promise<readonly IntervencionParaMapa[]>;
};

/**
 * Los nombres de lo que una intervencion referencia, ya legibles: el detalle
 * muestra "Centro (colonia)" y "Calle 20", no los uuid. Un `null` es "no se
 * pudo leer" -inexistente, dado de otro municipio o sin permiso de RLS-, y
 * los tres se ven igual a proposito: la pantalla dice "No disponible" sin
 * distinguir cual.
 */
export type ReferenciasDeIntervencion = {
  lugar: string | null;
  calle: string | null;
  reporte: { id: string; folio: string } | null;
  /**
   * La raiz del territorio del lugar, para las dos rutas de S15
   * (`/territorio?raiz=` y `/mapa-operativo?lugar=`). `null` cuando la
   * jerarquia no llega a una raiz conocida: un enlace sin ella apuntaria a
   * otro lugar, y es preferible no ofrecerlo.
   */
  raizId: string | null;
};

/**
 * Sin `tx`: el adaptador real abre el `withTenant` de `territorio` y el de
 * `reportes` por dentro, mismo corte que `LecturaDeUbicaciones` de
 * `reportes`. Lee solo por los ids de la intervencion; una referencia
 * ausente (`calleId`/`reporteId` nulos) vuelve `null` sin consultar nada.
 */
export type LectorDeReferencias = {
  leer(
    contexto: ContextoActual,
    ids: {
      lugarId: string;
      calleId: string | null;
      reporteId: string | null;
    },
  ): Promise<ReferenciasDeIntervencion>;
};

/**
 * Los tres filtros de la bandeja (S1). `lugarId` viaja como texto, no como el
 * id marcado de `territorio`: el filtro es un valor de la URL que el borde ya
 * valido con Zod, y el modulo no importa el dominio del otro.
 */
export type FiltrosDeIntervenciones = {
  estado?: EstadoDeIntervencion;
  tipo?: TipoDeIntervencion;
  lugarId?: string;
};

/**
 * La lectura de la bandeja. Devuelve las filas ya ordenadas -la mas reciente
 * primero, por `capturadoEn`- y acotadas, para que la pantalla no tenga que
 * decidir el orden ni traer el municipio entero.
 */
export type LectorDeIntervenciones = {
  listar(
    tx: TransaccionTenant,
    filtros: FiltrosDeIntervenciones,
  ): Promise<readonly IntervencionGuardada[]>;
};

/**
 * Los conteos por estado del tablero (S2). Aplica los mismos filtros que
 * `listar` y agrupa en Postgres, no en JavaScript: una columna puede tener
 * mas obras de las que la pantalla muestra, y contar las filas de la pagina
 * daria el numero de la pagina.
 */
export type ContadorDeIntervenciones = {
  contar(
    tx: TransaccionTenant,
    filtros: FiltrosDeIntervenciones,
  ): Promise<readonly FilaDeConteoDeIntervencion[]>;
};
