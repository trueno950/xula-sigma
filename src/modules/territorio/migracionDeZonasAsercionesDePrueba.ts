import { expect } from "vitest";
import {
  motul,
  subdominioMotul,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import type { DomicilioId, LugarId } from "./domain";
import type { EscenarioDeMigracion } from "./migracionDeZonasDePrueba";
import {
  leerDomiciliosMigrados,
  leerZonasYBajas,
} from "./migracionDeZonasDePrueba";
import { ejecutarMigracionConSalida } from "./migracionDeZonasRollbackDePrueba";

const opciones = (
  ayuntamientoId: typeof motul,
  escenario: EscenarioDeMigracion,
) => ({
  ayuntamientoId,
  asentamientoId: escenario.asentamientoId,
  sectorId: escenario.sectorId,
  manzanaId: escenario.manzanaId,
  nombreDelSector: "Sector migracion",
  nombreDeLaZonaVacia: "Sector vacio",
});
const zonaNombrada = <T extends { nombre: string }>(
  zonas: T[],
  nombre: string,
) => {
  const zona = zonas.find((fila) => fila.nombre === nombre);
  if (!zona) throw new Error(`Falta ${nombre}.`);
  return zona;
};
const origenDeMigracion = (lugarAnteriorId: LugarId) =>
  `script:migrar-sectores-a-zonas:${lugarAnteriorId}`;
type DomiciliosLeidos = {
  domiciliosMigrados: { id: DomicilioId; lugarId: LugarId }[];
  entradas: { entidadId: string | null; origen: string | null }[];
};
const verificarDomicilioMigrado = (opciones: {
  domicilios: DomiciliosLeidos;
  domicilioId: DomicilioId;
  coloniaId: LugarId;
  lugarAnteriorId: LugarId;
}) => {
  const { domicilios, domicilioId, coloniaId, lugarAnteriorId } = opciones;
  expect(domicilios.domiciliosMigrados).toEqual(
    expect.arrayContaining([{ id: domicilioId, lugarId: coloniaId }]),
  );
  expect(domicilios.entradas).toEqual(
    expect.arrayContaining([
      { entidadId: domicilioId, origen: origenDeMigracion(lugarAnteriorId) },
    ]),
  );
};
/** Los tres domicilios sembrados por `sembrarEscenarioDeMigracion` y su lugar anterior. */
const domiciliosDelEscenario = (
  escenario: EscenarioDeMigracion,
): { domicilioId: DomicilioId; lugarAnteriorId: LugarId }[] => [
  {
    domicilioId: escenario.domicilioDelSectorId,
    lugarAnteriorId: escenario.sectorId,
  },
  {
    domicilioId: escenario.domicilioDeLaManzanaId,
    lugarAnteriorId: escenario.manzanaId,
  },
  {
    domicilioId: escenario.domicilioConCalleAjenaId,
    lugarAnteriorId: escenario.sectorId,
  },
];
const verificarDomiciliosDeUnTenant = (
  domicilios: DomiciliosLeidos,
  escenario: EscenarioDeMigracion,
) => {
  for (const { domicilioId, lugarAnteriorId } of domiciliosDelEscenario(
    escenario,
  )) {
    verificarDomicilioMigrado({
      domicilios,
      domicilioId,
      coloniaId: escenario.coloniaId,
      lugarAnteriorId,
    });
  }
};
const verificarDomicilios = async (
  motulEscenario: EscenarioDeMigracion,
  ticulEscenario: EscenarioDeMigracion,
) => {
  const motulDomicilios = await leerDomiciliosMigrados(
    motul,
    motulEscenario.coloniaId,
  );
  const ticulDomicilios = await leerDomiciliosMigrados(
    ticul,
    ticulEscenario.coloniaId,
  );
  verificarDomiciliosDeUnTenant(motulDomicilios, motulEscenario);
  verificarDomiciliosDeUnTenant(ticulDomicilios, ticulEscenario);
};
const verificarBajasDeLugares = (
  bajas: {
    accion: string;
    entidad: string;
    entidadId: string | null;
    origen: string | null;
  }[],
  escenario: EscenarioDeMigracion,
) => {
  expect(bajas).toEqual(
    expect.arrayContaining([
      {
        accion: "BAJA_LUGAR",
        entidad: "lugares",
        entidadId: escenario.sectorId,
        origen: origenDeMigracion(escenario.coloniaId),
      },
      {
        accion: "BAJA_LUGAR",
        entidad: "lugares",
        entidadId: escenario.manzanaId,
        origen: origenDeMigracion(escenario.sectorId),
      },
    ]),
  );
};
const verificarZonas = async (
  motulEscenario: EscenarioDeMigracion,
  ticulEscenario: EscenarioDeMigracion,
  bajaEnDelSectorMotul: Date,
) => {
  const zonasMotul = await leerZonasYBajas(opciones(motul, motulEscenario));
  const zonasTicul = await leerZonasYBajas(opciones(ticul, ticulEscenario));
  const zonaMotul = zonaNombrada(zonasMotul.zonasMigradas, "Sector migracion");
  const zonaTicul = zonaNombrada(zonasTicul.zonasMigradas, "Sector migracion");
  const zonaVaciaMotul = zonaNombrada(zonasMotul.zonasMigradas, "Sector vacio");
  const zonaVaciaTicul = zonaNombrada(zonasTicul.zonasMigradas, "Sector vacio");
  expect(zonaMotul).toMatchObject({
    ayuntamientoId: motul,
    bajaEn: bajaEnDelSectorMotul,
  });
  expect(zonaTicul).toMatchObject({ ayuntamientoId: ticul, bajaEn: null });
  expect(zonaVaciaMotul.bajaEn).toBeNull();
  expect(zonaVaciaTicul.bajaEn).toBeNull();
  expect(zonaMotul.ayuntamientoId).not.toBe(ticul);
  expect(zonaTicul.ayuntamientoId).not.toBe(motul);
  expect(zonasMotul.membresias).toEqual([
    { zonaId: zonaMotul.id, calleId: motulEscenario.callePrincipalId },
  ]);
  expect(zonasTicul.membresias).toEqual([
    { zonaId: zonaTicul.id, calleId: ticulEscenario.callePrincipalId },
  ]);
  expect(zonasMotul.membresiasDeZonaVacia).toHaveLength(0);
  expect(zonasTicul.membresiasDeZonaVacia).toHaveLength(0);
  expect(zonasMotul.lugaresRestantes).toHaveLength(0);
  expect(zonasTicul.lugaresRestantes).toHaveLength(0);
  verificarBajasDeLugares(zonasMotul.bajas, motulEscenario);
  verificarBajasDeLugares(zonasTicul.bajas, ticulEscenario);
};
export const verificarMigracionDeAmbosTenants = async (opcionesDePrueba: {
  databaseUrl: string;
  motulEscenario: EscenarioDeMigracion;
  ticulEscenario: EscenarioDeMigracion;
  bajaEnDelSectorMotul: Date;
}) => {
  const resultado = ejecutarMigracionConSalida({
    databaseUrl: opcionesDePrueba.databaseUrl,
    subdominio: subdominioMotul,
  });
  await verificarDomicilios(
    opcionesDePrueba.motulEscenario,
    opcionesDePrueba.ticulEscenario,
  );
  await verificarZonas(
    opcionesDePrueba.motulEscenario,
    opcionesDePrueba.ticulEscenario,
    opcionesDePrueba.bajaEnDelSectorMotul,
  );
  expect(resultado.salida).toContain("calles_rechazadas");
  expect(resultado.salida).toContain(
    opcionesDePrueba.motulEscenario.calleDeOtroAsentamientoId,
  );
  expect(
    resultado.lugaresBorrados.find(
      ({ lugarId }) => lugarId === opcionesDePrueba.motulEscenario.sectorId,
    )?.bajaEn,
  ).not.toBeNull();
  return resultado.lugaresBorrados;
};
