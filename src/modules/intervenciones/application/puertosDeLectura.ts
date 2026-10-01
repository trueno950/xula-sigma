import type { ContextoActual } from "@/shared/auth/contexto";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  EstadoDeIntervencion,
  IntervencionId,
  TipoDeIntervencion,
} from "../domain";

export type LecturaDeUbicaciones = {
  de(
    tx: TransaccionTenant,
    lugarId: string,
    calleId: string | null,
  ): Promise<{ texto: string } | null>;
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
