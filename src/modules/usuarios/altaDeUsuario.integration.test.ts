import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { LARGO_MINIMO, verificarClave } from "@/shared/auth/contrasenia";
import { cuentas, usuarios } from "@/shared/auth/esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import type { Rol } from "@/shared/auth/roles";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { altaDeUsuario } from "./composicion";

/**
 * S3 y S4 contra Postgres, porque la clave temporal no se prueba mirando
 * el codigo: se prueba entrando con ella. El hash lo escribe
 * `altaDePersona` dentro de `withTenant`, y lo que se afirma es que
 * verifica contra la clave que la accion le va a mostrar una sola vez a la
 * administradora.
 */

let gente: GentePorMunicipio;

const actor = (rol: Rol = "ADMIN_MUNICIPAL") => contextoDe(gente, "motul", rol);

const altaNueva = (
  sobre: Partial<{ nombre: string; email: string; rol: string }> = {},
  contexto: ContextoActual = actor(),
) =>
  altaDeUsuario(contexto, {
    nombre: "Nueva Operadora",
    email: "nueva@motul.example.com",
    rol: "OPERADOR",
    ...sobre,
  });

const personas = () => withTenant(motul, (tx) => tx.select().from(usuarios));

const credencialDe = async (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([credencial]) => credencial);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("altaDeUsuario", () => {
  it("el ADMIN_MUNICIPAL da de alta un OPERADOR con una clave temporal que verifica", async () => {
    const { usuarioId, claveTemporal } = await altaNueva();

    const [fila] = await personas().then((todas) =>
      todas.filter((persona) => persona.id === usuarioId),
    );

    expect(fila?.rol).toBe("OPERADOR");
    expect(fila?.email).toBe("nueva@motul.example.com");
    expect(fila?.ayuntamientoId).toBe(motul);
    expect(fila?.bajaEn).toBeNull();
    expect(claveTemporal.length).toBeGreaterThanOrEqual(LARGO_MINIMO);

    const credencial = await credencialDe(usuarioId);
    expect(
      await verificarClave(credencial?.password ?? "", claveTemporal),
    ).toBe(true);
  });

  it("acepta CONSULTA", async () => {
    const { usuarioId } = await altaNueva({
      email: "consulta-nueva@motul.example.com",
      rol: "CONSULTA",
    });

    const filas = await personas();
    expect(filas.find((fila) => fila.id === usuarioId)?.rol).toBe("CONSULTA");
  });

  it.each(["ADMIN_MUNICIPAL", "SUPER_ADMIN", "Operador", "SECRETARIO"])(
    "rechaza el rol %s aunque llegue escrito a mano",
    async (rol) => {
      const antes = (await personas()).length;

      const fallo = await motivoDe(() =>
        altaNueva({ email: `rechazada-${rol}@motul.example.com`, rol }),
      );

      expect(fallo.codigo).toBe("ROL_NO_ASIGNABLE");
      expect((await personas()).length).toBe(antes);
    },
  );

  it("un correo ya registrado responde CORREO_YA_REGISTRADO y no crea otra fila", async () => {
    const antes = (await personas()).length;

    const fallo = await motivoDe(() =>
      altaNueva({ email: "operador@motul.example.com" }),
    );

    expect(fallo.codigo).toBe("CORREO_YA_REGISTRADO");
    expect((await personas()).length).toBe(antes);
  });

  it("el mismo correo en otro ayuntamiento no choca: la unicidad es compuesta", async () => {
    const { usuarioId } = await altaNueva(
      { email: "operador@motul.example.com" },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );

    const [fila] = await withTenant(ticul, (tx) =>
      tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)),
    );

    expect(fila?.ayuntamientoId).toBe(ticul);
  });

  it("un OPERADOR no da de alta a nadie", async () => {
    const antes = (await personas()).length;

    const fallo = await motivoDe(() =>
      altaNueva({ email: "sin-permiso@motul.example.com" }, actor("OPERADOR")),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await personas()).length).toBe(antes);
  });

  it("un CONSULTA tampoco", async () => {
    const fallo = await motivoDe(() =>
      altaNueva(
        { email: "sin-permiso-2@motul.example.com" },
        actor("CONSULTA"),
      ),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
  });

  it("cada alta trae una clave distinta", async () => {
    const primera = await altaNueva({ email: "dos@motul.example.com" });
    const segunda = await altaNueva({ email: "tres@motul.example.com" });

    expect(primera.claveTemporal).not.toBe(segunda.claveTemporal);
  });

  it("un correo con mayusculas choca con el mismo correo en minusculas", async () => {
    const antes = (await personas()).length;

    const fallo = await motivoDe(() =>
      altaNueva({ email: "OPERADOR@motul.example.com" }),
    );

    expect(fallo.codigo).toBe("CORREO_YA_REGISTRADO");
    expect((await personas()).length).toBe(antes);
  });

  it("una fila vieja con mayusculas tambien choca: la comparacion es por lower(email)", async () => {
    // El indice unico de Postgres compara exacto. Una fila escrita antes de
    // normalizar —o por cualquier camino que no pase por esta accion— sigue
    // siendo la misma persona, y el chequeo del adaptador la encuentra.
    await withTenant(motul, (tx) =>
      tx.insert(usuarios).values({
        ayuntamientoId: motul,
        name: "Persona Legada",
        email: "Legado@Motul.example.com",
        rol: "OPERADOR",
      }),
    );

    const fallo = await motivoDe(() =>
      altaNueva({ email: "legado@motul.example.com" }),
    );

    expect(fallo.codigo).toBe("CORREO_YA_REGISTRADO");
  });
});
