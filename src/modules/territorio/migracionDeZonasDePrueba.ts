import { and, eq } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { bitacora } from "@/shared/tenancy/esquema";
import { motul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "./domain";
import { domicilios } from "./infrastructure/esquema";
import {
  crearCalleEn,
  crearDomicilioEnCalleEn,
  crearLugarEn,
  crearLugarHijoEn,
} from "./lugarDePrueba";

type ArbolDeMigracion = {
  asentamientoId: LugarId;
  coloniaId: LugarId;
  sectorId: LugarId;
  manzanaId: LugarId;
  sectorVacioId: LugarId;
};
const sembrarArbol = async (
  ayuntamientoId: AyuntamientoId,
): Promise<ArbolDeMigracion> => {
  const asentamientoId = await crearLugarEn(
    ayuntamientoId,
    "cabecera",
    "Cabecera migracion",
  );
  const coloniaId = await crearLugarHijoEn({
    ayuntamientoId,
    tipo: "colonia",
    nombre: "Colonia migracion",
    padreId: asentamientoId,
  });
  const sectorId = await crearLugarHijoEn({
    ayuntamientoId,
    tipo: "sector",
    nombre: "Sector migracion",
    padreId: coloniaId,
  });
  const manzanaId = await crearLugarHijoEn({
    ayuntamientoId,
    tipo: "manzana",
    nombre: "Manzana migracion",
    padreId: sectorId,
  });
  const sectorVacioId = await crearLugarHijoEn({
    ayuntamientoId,
    tipo: "sector",
    nombre: "Sector vacio",
    padreId: coloniaId,
  });
  return { asentamientoId, coloniaId, sectorId, manzanaId, sectorVacioId };
};
const sembrarDomicilios = async (
  ayuntamientoId: AyuntamientoId,
  arbol: ArbolDeMigracion,
) => {
  const callePrincipalId = await crearCalleEn(
    ayuntamientoId,
    arbol.asentamientoId,
    "Calle migracion",
  );
  const domicilioDelSectorId = await crearDomicilioEnCalleEn(
    ayuntamientoId,
    arbol.sectorId,
    callePrincipalId,
  );
  const domicilioDeLaManzanaId = await crearDomicilioEnCalleEn(
    ayuntamientoId,
    arbol.manzanaId,
    callePrincipalId,
  );
  const asentamientoAjenoId = await crearLugarEn(
    ayuntamientoId,
    "comisaria",
    "Comisaria ajena",
  );
  const calleDeOtroAsentamientoId = await crearCalleEn(
    ayuntamientoId,
    asentamientoAjenoId,
    "Calle ajena",
  );
  const domicilioConCalleAjenaId = await crearDomicilioEnCalleEn(
    ayuntamientoId,
    arbol.sectorId,
    calleDeOtroAsentamientoId,
  );
  return {
    callePrincipalId,
    calleDeOtroAsentamientoId,
    domicilioDelSectorId,
    domicilioDeLaManzanaId,
    domicilioConCalleAjenaId,
  };
};
/** Cabecera -> colonia -> sector/manzana, con una zona vacia y calle ajena. */
export const sembrarEscenarioDeMigracion = async (ayuntamientoId = motul) => {
  const arbol = await sembrarArbol(ayuntamientoId);
  return { ...arbol, ...(await sembrarDomicilios(ayuntamientoId, arbol)) };
};
export type EscenarioDeMigracion = Awaited<
  ReturnType<typeof sembrarEscenarioDeMigracion>
>;

export const leerDomiciliosMigrados = (
  ayuntamientoId: AyuntamientoId,
  coloniaId: LugarId,
) =>
  withTenant(ayuntamientoId, async (tx) => ({
    domiciliosMigrados: await tx
      .select({ id: domicilios.id, lugarId: domicilios.lugarId })
      .from(domicilios)
      .where(
        and(
          eq(domicilios.ayuntamientoId, ayuntamientoId),
          eq(domicilios.lugarId, coloniaId),
        ),
      ),
    entradas: await tx
      .select({ entidadId: bitacora.entidadId, origen: bitacora.origen })
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "MIGRACION_DOMICILIO"),
          eq(bitacora.entidad, "domicilios"),
        ),
      ),
  }));

export { leerZonasYBajas } from "./migracionDeZonasLecturasDePrueba";
