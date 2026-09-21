import { expect } from "vitest";
import {
  motul,
  subdominioMotul,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
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
const origenDeMigracion = (lugarAnteriorId: string) =>
  `script:migrar-sectores-a-zonas:${lugarAnteriorId}`;
type DomiciliosLeidos = {
  domiciliosMigrados: { id: string; lugarId: string }[];
  entradas: { entidadId: string | null; origen: string | null }[];
};
const verificarDomicilioMigrado = (opciones: {
  domicilios: DomiciliosLeidos;
  domicilioId: string;
  coloniaId: string;
  lugarAnteriorId: string;
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
  verificarDomicilioMigrado({
    domicilios: motulDomicilios,
    domicilioId: motulEscenario.domicilioDelSectorId,
    coloniaId: motulEscenario.coloniaId,
    lugarAnteriorId: motulEscenario.sectorId,
  });
  verificarDomicilioMigrado({
    domicilios: motulDomicilios,
    domicilioId: motulEscenario.domicilioDeLaManzanaId,
    coloniaId: motulEscenario.coloniaId,
    lugarAnteriorId: motulEscenario.manzanaId,
  });
  verificarDomicilioMigrado({
    domicilios: ticulDomicilios,
    domicilioId: ticulEscenario.domicilioDelSectorId,
    coloniaId: ticulEscenario.coloniaId,
    lugarAnteriorId: ticulEscenario.sectorId,
  });
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
) => {
  const zonasMotul = await leerZonasYBajas(opciones(motul, motulEscenario));
  const zonasTicul = await leerZonasYBajas(opciones(ticul, ticulEscenario));
  const zonaMotul = zonaNombrada(zonasMotul.zonasMigradas, "Sector migracion");
  const zonaTicul = zonaNombrada(zonasTicul.zonasMigradas, "Sector migracion");
  expect(zonaMotul).toMatchObject({
    ayuntamientoId: motul,
    bajaEn: expect.any(Date),
  });
  expect(zonaTicul).toMatchObject({ ayuntamientoId: ticul, bajaEn: null });
  expect(zonaMotul.ayuntamientoId).not.toBe(ticul);
  expect(zonaTicul.ayuntamientoId).not.toBe(motul);
  expect(zonasMotul.membresias).toEqual([
    { zonaId: zonaMotul.id, calleId: motulEscenario.callePrincipalId },
  ]);
  expect(zonasTicul.membresias).toEqual([
    { zonaId: zonaTicul.id, calleId: ticulEscenario.callePrincipalId },
  ]);
  expect(zonasMotul.lugaresRestantes).toHaveLength(0);
  expect(zonasTicul.lugaresRestantes).toHaveLength(0);
  verificarBajasDeLugares(zonasMotul.bajas, motulEscenario);
  verificarBajasDeLugares(zonasTicul.bajas, ticulEscenario);
};
export const verificarMigracionDeAmbosTenants = async (opcionesDePrueba: {
  databaseUrl: string;
  motulEscenario: EscenarioDeMigracion;
  ticulEscenario: EscenarioDeMigracion;
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
