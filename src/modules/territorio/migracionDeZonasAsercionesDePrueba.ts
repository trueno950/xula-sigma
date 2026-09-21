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
  expect(motulDomicilios.domiciliosMigrados).toEqual(
    expect.arrayContaining([
      {
        id: motulEscenario.domicilioDelSectorId,
        lugarId: motulEscenario.coloniaId,
      },
    ]),
  );
  expect(ticulDomicilios.domiciliosMigrados).toEqual(
    expect.arrayContaining([
      {
        id: ticulEscenario.domicilioDelSectorId,
        lugarId: ticulEscenario.coloniaId,
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
