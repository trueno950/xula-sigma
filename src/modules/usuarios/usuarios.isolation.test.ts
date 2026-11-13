import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { darDeBajaUsuario } from "@/shared/auth/administracionDeUsuarios";
import { usuarios } from "@/shared/auth/esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { listarUsuarios } from "./composicion";

/**
 * S2 y S7 contra Postgres: el listado no filtra por `ayuntamiento_id` a
 * mano —lo acota la politica de `usuarios`—, y esa garantia solo existe en
 * la base. Un doble de prueba la daria por sentada.
 */

let gente: GentePorMunicipio;

const actor = (
  municipio: "motul" | "ticul",
  rol: "ADMIN_MUNICIPAL" | "OPERADOR",
) => contextoDe(gente, municipio, rol);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("listarUsuarios", () => {
  it("lista solo la gente del ayuntamiento del contexto", async () => {
    const filas = await listarUsuarios(actor("motul", "ADMIN_MUNICIPAL"));

    expect(filas).toHaveLength(4);
    expect(filas.map((fila) => fila.email).sort()).toEqual(
      ["admin_municipal", "consulta", "operador", "super_admin"].map(
        (rol) => `${rol}@motul.example.com`,
      ),
    );
    for (const ajena of Object.values(gente.ticul)) {
      expect(filas.map((fila) => fila.id)).not.toContain(ajena);
    }
  });

  it("trae nombre, correo, rol y estado de cada persona", async () => {
    const filas = await listarUsuarios(actor("motul", "ADMIN_MUNICIPAL"));
    const administrador = filas.find(
      (fila) => fila.id === gente.motul.ADMIN_MUNICIPAL,
    );

    expect(administrador).toEqual({
      id: gente.motul.ADMIN_MUNICIPAL,
      nombre: "ADMIN_MUNICIPAL de motul",
      email: "admin_municipal@motul.example.com",
      rol: "ADMIN_MUNICIPAL",
      dadoDeBaja: false,
    });
  });

  it("quien quedo de baja sigue en el listado, marcado", async () => {
    await darDeBajaUsuario(actor("motul", "ADMIN_MUNICIPAL"), {
      usuarioId: gente.motul.CONSULTA,
    });

    const filas = await listarUsuarios(actor("motul", "ADMIN_MUNICIPAL"));
    const dadaDeBaja = filas.find((fila) => fila.id === gente.motul.CONSULTA);

    expect(dadaDeBaja?.dadoDeBaja).toBe(true);
    expect(filas).toHaveLength(4);
  });

  it("un OPERADOR no puede listar: no administra usuarios", async () => {
    const fallo = await motivoDe(() =>
      listarUsuarios(actor("motul", "OPERADOR")),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
  });

  it("el listado no expone el hash de la credencial", async () => {
    // La credencial vive en `cuentas` (Antipatron 11 de `AGENTS.md`: un
    // volcado de hashes junto a los correos reales es material de fuerza
    // bruta offline). Se afirma sobre las claves del objeto, no sobre el
    // tipo: un `...fila` de mas en el futuro no compila, pero un `select()`
    // pelado si.
    const filas = await listarUsuarios(actor("motul", "ADMIN_MUNICIPAL"));

    for (const fila of filas) {
      expect(Object.keys(fila).sort()).toEqual([
        "dadoDeBaja",
        "email",
        "id",
        "nombre",
        "rol",
      ]);
    }
  });
});

describe("el listado bajo el tenant activo", () => {
  it("en Ticul devuelve otra gente, con el mismo correo", async () => {
    const filas = await withTenant(motul, (tx) =>
      tx.select({ email: usuarios.email }).from(usuarios),
    );

    expect(
      filas.every((fila) => fila.email.endsWith("@motul.example.com")),
    ).toBe(true);
    const enTicul = await listarUsuarios(actor("ticul", "ADMIN_MUNICIPAL"));
    expect(
      enTicul.every((fila) => fila.email.endsWith("@ticul.example.com")),
    ).toBe(true);
  });
});
