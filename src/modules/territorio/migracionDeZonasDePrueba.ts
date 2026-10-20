import { and, eq } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { bitacora } from "@/shared/tenancy/esquema";
import { motul } from "@/shared/tenancy/municipiosDePrueba";
import {
  crearCalleAnterior,
  crearDomicilioAnterior,
  crearLugarAnterior,
  withTenantAnterior,
} from "./conexionAnteriorAlCorteDePrueba";
import type { LugarId } from "./domain";
import { domicilios } from "./infrastructure/esquema";

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
  const asentamientoId = await crearLugarAnterior({
    ayuntamientoId,
    tipo: "cabecera",
    nombre: "Cabecera migracion",
  });
  const coloniaId = await crearLugarAnterior({
    ayuntamientoId,
    tipo: "colonia",
    nombre: "Colonia migracion",
    padreId: asentamientoId,
  });
  const sectorId = await crearLugarAnterior({
    ayuntamientoId,
    tipo: "sector",
    nombre: "Sector migracion",
    padreId: coloniaId,
  });
  const manzanaId = await crearLugarAnterior({
    ayuntamientoId,
    tipo: "manzana",
    nombre: "Manzana migracion",
    padreId: sectorId,
  });
  const sectorVacioId = await crearLugarAnterior({
    ayuntamientoId,
    tipo: "sector",
    nombre: "Sector vacio",
    padreId: coloniaId,
  });
  return { asentamientoId, coloniaId, sectorId, manzanaId, sectorVacioId };
};
const sembrarDomiciliosPropios = async (
  ayuntamientoId: AyuntamientoId,
  arbol: ArbolDeMigracion,
) => {
  const callePrincipalId = await crearCalleAnterior(
    ayuntamientoId,
    arbol.asentamientoId,
    "Calle migracion",
  );
  const domicilioDelSectorId = await crearDomicilioAnterior(
    ayuntamientoId,
    arbol.sectorId,
    callePrincipalId,
  );
  const domicilioDeLaManzanaId = await crearDomicilioAnterior(
    ayuntamientoId,
    arbol.manzanaId,
    callePrincipalId,
  );
  return { callePrincipalId, domicilioDelSectorId, domicilioDeLaManzanaId };
};
const sembrarDomicilioConCalleAjena = async (
  ayuntamientoId: AyuntamientoId,
  sectorId: LugarId,
) => {
  const asentamientoAjenoId = await crearLugarAnterior({
    ayuntamientoId,
    tipo: "comisaria",
    nombre: "Comisaria ajena",
  });
  const calleDeOtroAsentamientoId = await crearCalleAnterior(
    ayuntamientoId,
    asentamientoAjenoId,
    "Calle ajena",
  );
  const domicilioConCalleAjenaId = await crearDomicilioAnterior(
    ayuntamientoId,
    sectorId,
    calleDeOtroAsentamientoId,
  );
  return { calleDeOtroAsentamientoId, domicilioConCalleAjenaId };
};
const sembrarDomicilios = async (
  ayuntamientoId: AyuntamientoId,
  arbol: ArbolDeMigracion,
) => ({
  ...(await sembrarDomiciliosPropios(ayuntamientoId, arbol)),
  ...(await sembrarDomicilioConCalleAjena(ayuntamientoId, arbol.sectorId)),
});
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
  withTenantAnterior(ayuntamientoId, async (tx) => ({
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
