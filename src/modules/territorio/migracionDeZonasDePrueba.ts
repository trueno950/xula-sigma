import { and, eq, or } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { bitacora } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId, ZonaId } from "./domain";
import {
  callesDeZonas,
  domicilios,
  lugares,
  zonas,
} from "./infrastructure/esquema";
import { crearCalle, crearDomicilioEnCalle, crearLugar } from "./lugarDePrueba";

/** Cabecera -> colonia -> sector (con domicilio y calle ajena) -> manzana, mas un sector vacio. */
export const sembrarEscenarioDeMigracion = async () => {
  const asentamientoId = await crearLugar("cabecera", "Cabecera migracion");
  const coloniaId = await crearLugar(
    "colonia",
    "Colonia migracion",
    asentamientoId,
  );
  const sectorId = await crearLugar("sector", "Sector migracion", coloniaId);
  const manzanaId = await crearLugar("manzana", "Manzana migracion", sectorId);
  await crearLugar("sector", "Sector vacio", coloniaId);
  const callePrincipalId = await crearCalle(asentamientoId, "Calle migracion");
  const domicilioDelSectorId = await crearDomicilioEnCalle(
    sectorId,
    callePrincipalId,
    "10",
  );
  const domicilioDeLaManzanaId = await crearDomicilioEnCalle(
    manzanaId,
    callePrincipalId,
    "11",
  );
  const asentamientoAjenoId = await crearLugar("comisaria", "Comisaria ajena");
  const calleDeOtroAsentamientoId = await crearCalle(
    asentamientoAjenoId,
    "Calle ajena",
  );
  const domicilioConCalleAjenaId = await crearDomicilioEnCalle(
    sectorId,
    calleDeOtroAsentamientoId,
    "12",
  );
  return {
    asentamientoId,
    coloniaId,
    sectorId,
    manzanaId,
    callePrincipalId,
    calleDeOtroAsentamientoId,
    domicilioDelSectorId,
    domicilioDeLaManzanaId,
    domicilioConCalleAjenaId,
  };
};

export type EscenarioDeMigracion = Awaited<
  ReturnType<typeof sembrarEscenarioDeMigracion>
>;

/** Domicilios movidos a `coloniaId` y su bitacora de `MIGRACION_DOMICILIO`. */
export const leerDomiciliosMigrados = (
  ayuntamientoId: AyuntamientoId,
  coloniaId: LugarId,
) =>
  withTenant(ayuntamientoId, async (tx) => {
    const domiciliosMigrados = await tx
      .select({ id: domicilios.id, lugarId: domicilios.lugarId })
      .from(domicilios)
      .where(
        and(
          eq(domicilios.ayuntamientoId, ayuntamientoId),
          eq(domicilios.lugarId, coloniaId),
        ),
      );
    const entradas = await tx
      .select({ entidadId: bitacora.entidadId, origen: bitacora.origen })
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "MIGRACION_DOMICILIO"),
          eq(bitacora.entidad, "domicilios"),
        ),
      );
    return { domiciliosMigrados, entradas };
  });

/**
 * Zonas creadas bajo `asentamientoId` -con sus pertenencias de calle-, mas
 * lo que quedo de `sectorId`/`manzanaId` en `lugares` y su bitacora de baja.
 */
export const leerZonasYBajas = (opciones: {
  ayuntamientoId: AyuntamientoId;
  asentamientoId: LugarId;
  sectorId: LugarId;
  manzanaId: LugarId;
  nombreDelSector: string;
  nombreDeLaZonaVacia: string;
}) => {
  const {
    ayuntamientoId,
    asentamientoId,
    sectorId,
    manzanaId,
    nombreDelSector,
    nombreDeLaZonaVacia,
  } = opciones;
  return withTenant(ayuntamientoId, async (tx) => {
    const zonasMigradas = await tx
      .select({ id: zonas.id, lugarId: zonas.lugarId, nombre: zonas.nombre })
      .from(zonas)
      .where(
        and(
          eq(zonas.ayuntamientoId, ayuntamientoId),
          eq(zonas.lugarId, asentamientoId),
        ),
      );
    const zonaDelSector = zonasMigradas.find(
      ({ nombre }) => nombre === nombreDelSector,
    );
    const zonaVacia = zonasMigradas.find(
      ({ nombre }) => nombre === nombreDeLaZonaVacia,
    );

    const membresiasDe = async (zonaId: ZonaId | undefined) =>
      zonaId
        ? tx
            .select({
              zonaId: callesDeZonas.zonaId,
              calleId: callesDeZonas.calleId,
            })
            .from(callesDeZonas)
            .where(
              and(
                eq(callesDeZonas.ayuntamientoId, ayuntamientoId),
                eq(callesDeZonas.zonaId, zonaId),
              ),
            )
        : [];

    const membresias = await membresiasDe(zonaDelSector?.id);
    const membresiasDeZonaVacia = await membresiasDe(zonaVacia?.id);

    const lugaresRestantes = await tx
      .select({ id: lugares.id })
      .from(lugares)
      .where(or(eq(lugares.id, sectorId), eq(lugares.id, manzanaId)));

    const bajas = await tx
      .select({
        accion: bitacora.accion,
        entidad: bitacora.entidad,
        entidadId: bitacora.entidadId,
        origen: bitacora.origen,
      })
      .from(bitacora)
      .where(
        and(eq(bitacora.accion, "BAJA_LUGAR"), eq(bitacora.entidad, "lugares")),
      );

    return {
      zonasMigradas,
      membresias,
      membresiasDeZonaVacia,
      lugaresRestantes,
      bajas,
    };
  });
};
