import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDarDeBajaCalle } from "./application/darDeBajaCalle";
import { CalleEnZonaError, type CalleId, type LugarId } from "./domain";
import { calles } from "./infrastructure/esquema";
import { callesDeZonas } from "./infrastructure/esquemaDeCallesDeZonas";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const darDeBajaCalle = crearDarDeBajaCalle(repositorioDeCallesSql);

/** La fila cruda: `buscarPorId` esconde las calles dadas de baja. */
const leerCalle = (id: CalleId) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx.select().from(calles).where(eq(calles.id, id));
    return fila;
  });

/** Una calle de `lugarId` metida en una zona nueva, viva o ya dada de baja. */
const calleEnZona = async (
  lugarId: LugarId,
  { nombre, bajaEn }: { nombre: string; bajaEn: Date | null },
) => {
  const calleId = await crearCalle(lugarId, nombre);
  await withTenant(motul, async (tx) => {
    const [zona] = await tx
      .insert(zonas)
      .values({ ayuntamientoId: motul, lugarId, nombre: `Zona ${nombre}` })
      .returning({ id: zonas.id });
    if (!zona) throw new Error("La zona de prueba no fue creada.");
    await tx
      .insert(callesDeZonas)
      .values({ ayuntamientoId: motul, zonaId: zona.id, calleId, lugarId });
    if (bajaEn) {
      await tx.update(zonas).set({ bajaEn }).where(eq(zonas.id, zona.id));
    }
  });
  return calleId;
};

describe("darDeBajaCalle contra una calle en zona", () => {
  it("rechaza la baja de una calle en una zona activa y no toca la fila", async () => {
    const lugarId = await crearLugar("comisaria", "Baja con zona viva");
    const calleId = await calleEnZona(lugarId, {
      nombre: "Calle en zona viva",
      bajaEn: null,
    });
    const antes = await leerCalle(calleId);

    await expect(darDeBajaCalle(calleId, contextoDe())).rejects.toBeInstanceOf(
      CalleEnZonaError,
    );

    expect(antes?.bajaEn).toBeNull();
    await expect(leerCalle(calleId)).resolves.toEqual(antes);
  });

  it("da de baja una calle que solo pertenece a una zona dada de baja", async () => {
    const lugarId = await crearLugar("comisaria", "Baja con zona muerta");
    const calleId = await calleEnZona(lugarId, {
      nombre: "Calle en zona muerta",
      bajaEn: new Date(),
    });

    await darDeBajaCalle(calleId, contextoDe());

    const despues = await leerCalle(calleId);
    expect(despues?.bajaEn).toBeInstanceOf(Date);
  });
});
