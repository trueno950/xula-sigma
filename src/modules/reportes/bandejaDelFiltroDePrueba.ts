import { eq } from "drizzle-orm";
import { altaDeLugar, type LugarId } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { motul, ticul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import { registrarReporte } from "./composicion";
import type { AreaResponsable, EstadoDeReporte } from "./domain";
import { reportes } from "./infrastructure/esquema";

/**
 * El escenario de S2 de `gestion-municipal` para los tests de integracion de
 * la bandeja: una comisaria de Motul con una colonia adentro, una comisaria
 * de Ticul, y un reporte por lugar con su area y su estado.
 *
 * Compartido por `filtrosPorLugarYArea` y `conteosDeReportes`, que necesitan
 * exactamente los mismos datos y se separaron por la metrica de lineas por
 * archivo. No es un `*.test.ts`, asi que vitest no lo recoge como suite;
 * mismo criterio que `reporteDePrueba.ts`.
 */

export type Municipio = "motul" | "ticul";

export type EscenarioDeLaBandeja = {
  readonly gente: GentePorMunicipio;
  readonly comisaria: LugarId;
  readonly colonia: LugarId;
  readonly lugarAjeno: LugarId;
  /** Reportes: uno en la comisaria, dos en la colonia y uno en Ticul. */
  readonly enComisaria: string;
  readonly enColonia: string;
  readonly sinArea: string;
  readonly ajeno: string;
};

const ayuntamiento = (municipio: Municipio) =>
  municipio === "motul" ? motul : ticul;

const actor = (
  gente: GentePorMunicipio,
  municipio: Municipio,
  rol: "ADMIN_MUNICIPAL" | "OPERADOR",
) => contextoDe(gente, municipio, rol);

const lugarDe = async (opciones: {
  gente: GentePorMunicipio;
  municipio: Municipio;
  nombre: string;
  padreId: LugarId | null;
}): Promise<LugarId> => {
  const { id } = await altaDeLugar(
    {
      tipo: opciones.padreId ? "colonia" : "comisaria",
      nombre: opciones.nombre,
      padreId: opciones.padreId,
    },
    actor(opciones.gente, opciones.municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const reporteEn = async (opciones: {
  gente: GentePorMunicipio;
  municipio: Municipio;
  lugarId: LugarId;
  area: AreaResponsable | null;
  estado?: EstadoDeReporte;
}): Promise<string> => {
  const id = await registrarReporte(
    {
      tipo: "BACHE",
      referencia: null,
      descripcion: "Bache frente al parque",
      personaId: null,
      lugarId: opciones.lugarId,
      calleId: null,
    },
    actor(opciones.gente, opciones.municipio, "OPERADOR"),
  );

  await withTenant(ayuntamiento(opciones.municipio), (tx) =>
    tx
      .update(reportes)
      .set({
        areaResponsable: opciones.area,
        ...(opciones.estado ? { estado: opciones.estado } : {}),
      })
      .where(eq(reportes.id, id)),
  );

  return id;
};

export async function sembrarLaBandeja(): Promise<EscenarioDeLaBandeja> {
  const gente = await sembrarGente();

  const comisaria = await lugarDe({
    gente,
    municipio: "motul",
    nombre: "Comisaria del filtro",
    padreId: null,
  });
  const colonia = await lugarDe({
    gente,
    municipio: "motul",
    nombre: "Colonia del filtro",
    padreId: comisaria,
  });
  const lugarAjeno = await lugarDe({
    gente,
    municipio: "ticul",
    nombre: "Comisaria ajena del filtro",
    padreId: null,
  });

  return {
    gente,
    comisaria,
    colonia,
    lugarAjeno,
    enComisaria: await reporteEn({
      gente,
      municipio: "motul",
      lugarId: comisaria,
      area: "OBRAS_PUBLICAS",
      estado: "RECIBIDO",
    }),
    enColonia: await reporteEn({
      gente,
      municipio: "motul",
      lugarId: colonia,
      area: "ALUMBRADO_PUBLICO",
    }),
    sinArea: await reporteEn({
      gente,
      municipio: "motul",
      lugarId: colonia,
      area: null,
      estado: "RESUELTO",
    }),
    ajeno: await reporteEn({
      gente,
      municipio: "ticul",
      lugarId: lugarAjeno,
      area: "OBRAS_PUBLICAS",
    }),
  };
}

/** El contexto de administracion de Motul o Ticul para el escenario. */
export const contextoDelEscenario = (
  escenario: EscenarioDeLaBandeja,
  municipio: Municipio,
) => actor(escenario.gente, municipio, "ADMIN_MUNICIPAL");
