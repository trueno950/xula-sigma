import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { callesSinPunto } from "./composicion";
import {
  altaDeCalle,
  altaDeLugar,
  type CalleId,
  darDeBajaCalle,
  type LugarId,
  ubicarCalle,
} from "./index";

/**
 * S3 de `gestion-municipal` contra Postgres real: cuantas calles de cada
 * territorio no tienen punto. Lo resuelve un solo recorrido de la jerarquia
 * -cada lugar con su raiz-, asi que lo que se prueba es que cada calle caiga
 * en el territorio correcto y que una calle dada de baja no cuente.
 *
 * Las calles y los lugares se crean por la superficie publica del modulo,
 * nunca por SQL directo.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;
let comisaria: LugarId;
let otraComisaria: LugarId;
let calleDeLaComisaria: CalleId;
let calleUbicada: CalleId;
let calleDadaDeBaja: CalleId;
let calleDeTicul: CalleId;

const contexto = (municipio: Municipio) =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

const lugarDe = async (
  municipio: Municipio,
  nombre: string,
  padreId: LugarId | null,
) => {
  const { id } = await altaDeLugar(
    { tipo: padreId ? "colonia" : "comisaria", nombre, padreId },
    contexto(municipio),
  );
  return id;
};

const calleEn = async (
  municipio: Municipio,
  lugarId: LugarId,
  nombre: string,
): Promise<CalleId> =>
  (await altaDeCalle({ nombre, lugarId }, contexto(municipio))).id;

const nombresDe = async (municipio: Municipio) => {
  const filas = await callesSinPunto(contexto(municipio));
  return filas.map((fila) => `${fila.raizNombre}:${fila.calleNombre}`);
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();

  comisaria = await lugarDe("motul", "Comisaria sin ubicar", null);
  // La colonia no tiene catalogo de calles propio: existe para probar que el
  // recorrido no la confunde con una raiz.
  await lugarDe("motul", "Colonia sin calles", comisaria);
  otraComisaria = await lugarDe("motul", "Otra comisaria sin ubicar", null);
  const lugarAjeno = await lugarDe("ticul", "Comisaria ajena sin ubicar", null);

  calleDeLaComisaria = await calleEn("motul", comisaria, "Calle sin punto");
  calleUbicada = await calleEn("motul", comisaria, "Calle ya ubicada");
  calleDadaDeBaja = await calleEn("motul", otraComisaria, "Calle de baja");
  calleDeTicul = await calleEn("ticul", lugarAjeno, "Calle de Ticul");

  await ubicarCalle(
    calleUbicada,
    { latitud: 21.02, longitud: -89.6 },
    contexto("motul"),
  );
  await darDeBajaCalle(calleDadaDeBaja, contexto("motul"));
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("calles sin punto por territorio", () => {
  it("una calle cuenta para el asentamiento que la contiene, sin duplicarse por sus colonias", async () => {
    const filas = await callesSinPunto(contexto("motul"));

    const deLaComisaria = filas.filter(
      (fila) => String(fila.calleId) === calleDeLaComisaria,
    );

    expect(deLaComisaria).toHaveLength(1);
    expect(deLaComisaria[0]).toMatchObject({
      raizId: comisaria,
      raizNombre: "Comisaria sin ubicar",
      lugarId: comisaria,
      calleNombre: "Calle sin punto",
    });
  });

  it("una calle ubicada y una dada de baja no aparecen", async () => {
    const filas = await callesSinPunto(contexto("motul"));
    const nombres = filas.map((fila) => fila.calleNombre);

    expect(nombres).not.toContain("Calle ya ubicada");
    expect(nombres).not.toContain("Calle de baja");
    expect(nombres).toContain("Calle sin punto");
  });

  it("cada municipio ve solo sus calles sin punto", async () => {
    const deMotul = await callesSinPunto(contexto("motul"));

    expect(deMotul.map((fila) => String(fila.calleId))).not.toContain(
      String(calleDeTicul),
    );
    await expect(nombresDe("motul")).resolves.toContain(
      "Comisaria sin ubicar:Calle sin punto",
    );
    await expect(nombresDe("motul")).resolves.not.toContain(
      "Comisaria ajena sin ubicar:Calle de Ticul",
    );
    await expect(nombresDe("ticul")).resolves.toContain(
      "Comisaria ajena sin ubicar:Calle de Ticul",
    );
  });

  it("las filas llegan ordenadas por territorio y por calle", async () => {
    const nombres = (await callesSinPunto(contexto("ticul"))).map(
      (fila) => fila.raizNombre,
    );

    expect([...nombres].sort()).toEqual(nombres);
  });
});
