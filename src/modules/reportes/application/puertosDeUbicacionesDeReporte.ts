import type { ContextoActual } from "@/shared/auth/contexto";
import type { ReporteGuardado } from "./puertosDeFilas";

/**
 * Como capturo la operadora la ubicacion del reporte: «Lugar y calle» o
 * «Domicilio registrado» (S9 del formulario de alta). La pantalla elige cual
 * de las dos lecturas pintar; los nombres de calle y lugar siguen
 * disponibles en los dos casos.
 */
export type ModoDeUbicacion = "CALLE" | "DOMICILIO";

/** Lo que la bandeja (S4) y el detalle (S11) muestran de donde ocurrio un reporte. */
export type UbicacionDeReporte = {
  readonly modo: ModoDeUbicacion;
  /** Nombre del lugar capturado, p. ej. «Colonia Centro»; `null` si ya no esta en el catalogo. */
  readonly lugar: string | null;
  /** `id` de la calle: su historial es `/calles/[id]/historial`. */
  readonly calleId: string | null;
  readonly calle: string | null;
  /** Etiqueta del domicilio registrado; `null` si el reporte se capturo por «Lugar y calle». */
  readonly domicilio: string | null;
  /** Raiz del territorio del lugar: `/mapa-operativo?lugar=<raizId>`. */
  readonly raizId: string | null;
};

export type NombresDeLugar = {
  readonly nombre: string;
  /** `null` cuando la jerarquia no llega a una raiz conocida: un enlace al mapa sin ella apuntaria a otro lugar. */
  readonly raizId: string | null;
};

/** Los nombres que resolvio `territorio`, indexados por el `id` de cada catalogo. */
export type CatalogoDeNombres = {
  readonly lugares: ReadonlyMap<string, NombresDeLugar>;
  readonly calles: ReadonlyMap<string, string>;
  readonly domicilios: ReadonlyMap<string, string>;
};

/** Los ids de una pagina, sin repetir: una lectura por catalogo, nunca una por fila. */
export type IdsDeUbicacion = {
  readonly lugares: readonly string[];
  readonly calles: readonly string[];
  readonly domicilios: readonly string[];
};

/**
 * Lo que `reportes` necesita de `territorio` para nombrar una ubicacion.
 * `lugares`, `calles` y `domicilios` son de ese modulo (antipatron 8 de
 * `AGENTS.md`), asi que el adaptador pasa por su API publica -mismo criterio
 * que `crearLectorDeUbicacionesPorTerritorio`-.
 *
 * Recibe los ids de toda la pagina en una sola llamada: pedir los nombres
 * fila por fila seria un N+1 por pantalla.
 */
export type LecturaDeNombresDeTerritorio = {
  leer(ids: IdsDeUbicacion): Promise<CatalogoDeNombres>;
};

/** Igual que `LecturaDeUbicaciones`: se fabrica con el contexto del request. */
export type CrearLecturaDeNombres = (
  contexto: ContextoActual,
) => LecturaDeNombresDeTerritorio;

/** La fila de la bandeja: el reporte mas donde ocurrio (S4). */
export type ReporteDeBandeja = ReporteGuardado & {
  readonly ubicacion: UbicacionDeReporte;
};
