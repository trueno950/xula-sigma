import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeCalle } from "./application/altaDeCalle";
import { crearDarDeBajaCalle } from "./application/darDeBajaCalle";
import { comoLugarId, NombreDeCalleDuplicadoError } from "./domain";
import { lugares } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const altaDeCalle = crearAltaDeCalle(
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
);
const darDeBajaCalle = crearDarDeBajaCalle(repositorioDeCallesSql);

describe("altaDeCalle", () => {
  it("rechaza un lugarId de otro municipio como si no existiera: RLS lo esconde antes del FK", async () => {
    const [lugarDeTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(lugares)
        .values({
          ayuntamientoId: ticul,
          tipo: "comisaria",
          nombre: "Yotholin",
        })
        .returning({ id: lugares.id }),
    );

    await expect(
      altaDeCalle(
        { nombre: "Calle ajena", lugarId: comoLugarId(lugarDeTicul!.id) },
        contextoDe(),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza el mismo nombre en el mismo lugar", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria alta duplicada");
    await altaDeCalle({ nombre: "Calle 21", lugarId: comisaria }, contextoDe());

    await expect(
      altaDeCalle({ nombre: "Calle 21", lugarId: comisaria }, contextoDe()),
    ).rejects.toBeInstanceOf(NombreDeCalleDuplicadoError);
  });

  it("permite reutilizar el nombre despues de una baja logica", async () => {
    const comisaria = await crearLugar(
      "comisaria",
      "Comisaria nombre liberado",
    );
    const nombre = "Calle 21";
    const { id } = await altaDeCalle(
      { nombre, lugarId: comisaria },
      contextoDe(),
    );

    await darDeBajaCalle(id, contextoDe());

    await expect(
      altaDeCalle({ nombre, lugarId: comisaria }, contextoDe()),
    ).resolves.toMatchObject({ id: expect.any(String) });
  });
});
