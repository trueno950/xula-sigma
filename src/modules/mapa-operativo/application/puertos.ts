import type { ContextoActual } from "@/shared/auth/contexto";
import type { PuntoDeMapa } from "../domain";

export type CalleParaMapaOperativo = {
  id: string;
  nombre: string;
  /** El lugar donde la calle cuelga hoy: define a que territorio pertenece un hecho. */
  lugarId: string;
  punto: PuntoDeMapa | null;
};
export type ReporteParaMapaOperativo = {
  id: string;
  folio: string;
  tipo: string;
  estado: string;
  areaResponsable: string | null;
  calleId: string | null;
  lugarId: string;
  /**
   * Fecha civil del registro (`YYYY-MM-DD` en `America/Merida`), ya resuelta
   * por el adaptador con `shared/lib/fecha`: es lo que la senal de atraso de
   * S1 necesita, y el dominio del mapa no conoce zonas horarias ni `Date`.
   */
  fechaDeRegistro: string;
};
export type IntervencionParaMapaOperativo = {
  id: string;
  tipo: string;
  estado: string;
  calleId: string | null;
  lugarId: string;
  /** Fecha civil del hecho (`YYYY-MM-DD`), como la guarda `intervenciones`. */
  fechaDeOcurrencia: string;
};

/** Una calle activa sin punto, con la raiz de su territorio (S3). */
export type CalleSinPuntoParaMapaOperativo = {
  calleId: string;
  calleNombre: string;
  lugarId: string;
  raizId: string;
  raizNombre: string;
};

/** Una opcion del selector de territorio: la cabecera o una comisaria. */
export type TerritorioParaMapaOperativo = { id: string; nombre: string };

export type FuentesDeMapa = {
  callesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly CalleParaMapaOperativo[]>;
  reportesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly ReporteParaMapaOperativo[]>;
  intervencionesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly IntervencionParaMapaOperativo[]>;
  territoriosParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly TerritorioParaMapaOperativo[]>;
  /**
   * El umbral de atraso del municipio, leido de `reportes` por la API publica
   * de ese modulo. `reportes` es el dueno de la regla; el mapa solo la aplica
   * para marcar sus pines.
   */
  umbralDeAtraso(contexto: ContextoActual): Promise<number>;
  /**
   * S3: las calles sin punto de cada territorio, leidas por la API publica de
   * `territorio` -el mapa no importa su dominio ni reimplementa la jerarquia-.
   */
  callesSinUbicar(
    contexto: ContextoActual,
  ): Promise<readonly CalleSinPuntoParaMapaOperativo[]>;
  /** El lugar y todos sus descendientes, a cualquier profundidad. */
  lugaresDelSubarbol(
    contexto: ContextoActual,
    lugarId: string,
  ): Promise<readonly string[]>;
};
export type FiltrosDeMapa = {
  tipo?: string | undefined;
  estado?: string | undefined;
  area?: string | undefined;
  /** El `?lugar=`: la raiz elegida; `undefined` es «todo el municipio». */
  lugar?: string | undefined;
};
