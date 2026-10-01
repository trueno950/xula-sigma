import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearAltaDePersona, crearBuscarPersonas } from "./application";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";

/**
 * Contra Postgres real: la similitud de trigramas sola no encontraba a una
 * persona por un apellido suelto ni por su CURP. Apellidos inventados
 * (Xoolal, Pacab) para que ninguna otra prueba del mismo municipio
 * compita por el resultado.
 */

const CURP = "XOPZ800101MYNXXX09";

const contextoDe = (
  ayuntamientoId: ContextoActual["ayuntamientoId"],
): ContextoActual => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

const enMotul = contextoDe(motul);
const enTicul = contextoDe(ticul);

const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const buscarPersonas = crearBuscarPersonas(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);

const encuentraA = async (cadena: string, id: string, ctx = enMotul) => {
  const { personas } = await buscarPersonas(cadena, ctx);
  return personas.some((persona) => persona.id === id);
};

let personaDeMotul = "";

beforeAll(async () => {
  await sembrar();
  const { id } = await altaDePersona(
    {
      nombres: "Zuleyma Guadalupe",
      primerApellido: "Xoolal",
      segundoApellido: "Pacab",
      curp: CURP,
    },
    enMotul,
  );
  personaDeMotul = id;
  await altaDePersona(
    {
      nombres: "Zuleyma Guadalupe",
      primerApellido: "Xoolal",
      segundoApellido: "Pacab",
      curp: CURP,
    },
    enTicul,
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("busqueda por palabra suelta y por CURP", () => {
  it.each([
    ["el primer apellido solo", "Xoolal"],
    ["el segundo apellido solo", "pacab"],
    ["el primer nombre solo", "Zuleyma"],
    ["un prefijo de palabra", "xool"],
    ["un prefijo con acento y mayusculas", "ZULÉ"],
    ["dos prefijos de palabras distintas", "zul xoo"],
  ])("encuentra a la persona por %s", async (_caso, cadena) => {
    expect(await encuentraA(cadena, personaDeMotul)).toBe(true);
  });

  it("no encuentra por una palabra que ninguna palabra del nombre empieza", async () => {
    expect(await encuentraA("olal", personaDeMotul)).toBe(false);
  });

  it("todas las palabras tienen que ser prefijo de alguna: una ajena descarta", async () => {
    expect(await encuentraA("xoolal quintana", personaDeMotul)).toBe(false);
  });

  it("un comodin de LIKE escrito por la operadora es texto, no patron", async () => {
    expect(await encuentraA("x%", personaDeMotul)).toBe(false);
    expect(await encuentraA("_oolal", personaDeMotul)).toBe(false);
  });

  it.each([
    ["la CURP completa", CURP],
    ["la CURP en minusculas", CURP.toLowerCase()],
    ["un prefijo de la CURP", "XOPZ8001"],
  ])("encuentra a la persona por %s", async (_caso, cadena) => {
    expect(await encuentraA(cadena, personaDeMotul)).toBe(true);
  });

  it("no encuentra por un fragmento de CURP que no es prefijo", async () => {
    expect(await encuentraA("800101MYNXXX09", personaDeMotul)).toBe(false);
  });

  it("sigue tolerando errores de tecleo por similitud de trigramas", async () => {
    expect(await encuentraA("zuleima gpe xoolal", personaDeMotul)).toBe(true);
  });
});

describe("aislamiento de la busqueda por palabra y por CURP", () => {
  it.each([
    ["apellido", "Xoolal"],
    ["CURP", CURP],
  ])(
    "la persona de Ticul no aparece bajo Motul por %s",
    async (_caso, cadena) => {
      const { personas } = await buscarPersonas(cadena, enMotul);

      expect(personas).toHaveLength(1);
      expect(personas[0]?.id).toBe(personaDeMotul);
    },
  );

  it("la misma busqueda bajo Ticul devuelve solo la de Ticul", async () => {
    const { personas } = await buscarPersonas(CURP, enTicul);

    expect(personas).toHaveLength(1);
    expect(personas[0]?.id).not.toBe(personaDeMotul);
  });
});

/**
 * El `ORDER BY` de `buscar` ordena por `similarity` y, si hay coincidencias,
 * por CURP. Con `LIMIT`, una coincidencia de CURP -cuya similitud con la
 * cadena tecleada es casi cero- queda detras de cualquier nombre que se
 * parezca un poco, y se cae de la pagina.
 */
describe("la coincidencia por CURP no se cae de la pagina", () => {
  it("con mas coincidencias por trigramas que el limite, la de CURP entra igual", async () => {
    const porTrigramas = [
      { nombres: "Xopz", primerApellido: "Uc" },
      { nombres: "Xopz", primerApellido: "Uz" },
      { nombres: "Xopo", primerApellido: "Xopz" },
    ];

    for (const nombres of porTrigramas) {
      await altaDePersona(
        { ...nombres, segundoApellido: null, curp: null },
        enMotul,
      );
    }

    const { personas, hayMas } = await buscarPersonas("XOPZ8001", enMotul, {
      limite: 2,
    });

    expect(personas).toHaveLength(2);
    expect(hayMas).toBe(true);
    expect(personas[0]?.id).toBe(personaDeMotul);
  });
});
