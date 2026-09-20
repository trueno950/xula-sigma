import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearReparentearCalle } from "./application/reparentearCalle";
import { CalleEnZonaError, type CalleId } from "./domain";
import { callesDeZonas } from "./infrastructure/esquemaDeCallesDeZonas";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const reparentearCalle = crearReparentearCalle(
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
);

const leerCalle = (id: CalleId) =>
  withTenant(motul, (tx) => repositorioDeCallesSql.buscarPorId(tx, id));

describe("reparentearCalle contra una calle enzonada", () => {
  it("rechaza mover una calle en una zona y conserva la pertenencia", async () => {
    const lugarOrigen = await crearLugar("comisaria", "Origen con zona");
    const lugarDestino = await crearLugar("comisaria", "Destino con zona");
    const calleId = await crearCalle(lugarOrigen, "Calle en zona");
    const [zona] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({
          ayuntamientoId: motul,
          lugarId: lugarOrigen,
          nombre: "Zona viva",
        })
        .returning({ id: zonas.id }),
    );
    if (!zona) throw new Error("La zona de prueba no fue creada.");
    await withTenant(motul, (tx) =>
      tx.insert(callesDeZonas).values({
        ayuntamientoId: motul,
        zonaId: zona.id,
        calleId,
        lugarId: lugarOrigen,
      }),
    );

    await expect(
      reparentearCalle(calleId, lugarDestino, contextoDe()),
    ).rejects.toBeInstanceOf(CalleEnZonaError);

    await expect(leerCalle(calleId)).resolves.toMatchObject({
      lugarId: lugarOrigen,
    });
    await expect(
      withTenant(motul, (tx) =>
        tx
          .select()
          .from(callesDeZonas)
          .where(eq(callesDeZonas.calleId, calleId)),
      ),
    ).resolves.toHaveLength(1);
  });
});
