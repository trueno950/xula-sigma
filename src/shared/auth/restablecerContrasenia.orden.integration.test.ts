import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { restablecerContrasenia } from "./administracionDeUsuarios";
import { cuentas, sesiones } from "./esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "./genteDePrueba";

let gente: GentePorMunicipio;

const claveDe = (id: string, municipio: "motul" | "ticul" = "motul") =>
  withTenant(municipio === "motul" ? motul : motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, id)),
  ).then(([c]) => c?.password as string);

const sesionesDe = (id: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(sesiones).where(eq(sesiones.userId, id)),
  ).then((filas) => filas.map((f) => f.token).sort());

const trazas = (id: string) =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "RESTABLECER_CONTRASENIA"),
          eq(bitacora.entidadId, id),
        ),
      ),
  );

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("probe T3 orden y oracle", () => {
  it("objetivo de otro municipio, id inexistente y actor sin rol: mismo rechazo de antes", async () => {
    const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const ajeno = await motivoDe(() =>
      restablecerContrasenia(admin, {
        usuarioId: gente.ticul.CONSULTA,
        nuevaClave: "clave-larga-1",
      }),
    );
    const inexistente = await motivoDe(() =>
      restablecerContrasenia(admin, {
        usuarioId: randomUUID(),
        nuevaClave: "clave-larga-1",
      }),
    );
    const operador = contextoDe(gente, "motul", "OPERADOR");
    const sinRol = await motivoDe(() =>
      restablecerContrasenia(operador, {
        usuarioId: operador.usuario.id,
        nuevaClave: "clave-larga-1",
      }),
    );

    expect(ajeno.codigo).toBe("NO_ENCONTRADO");
    expect(inexistente.codigo).toBe("NO_ENCONTRADO");
    expect(sinRol.codigo).toBe("NO_AUTORIZADO");
  });

  it("la propia cuenta: rechazo, misma credencial, mismas sesiones, sin bitacora", async () => {
    const quien = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const antesClave = await claveDe(quien.usuario.id);
    const antesSesiones = await sesionesDe(quien.usuario.id);

    const fallo = await motivoDe(() =>
      restablecerContrasenia(quien, {
        usuarioId: quien.usuario.id,
        nuevaClave: "clave-larga-2",
      }),
    );

    expect(fallo.codigo).toBe("RESTABLECIMIENTO_PROPIO");
    expect(await claveDe(quien.usuario.id)).toBe(antesClave);
    expect(await sesionesDe(quien.usuario.id)).toEqual(antesSesiones);
    expect(await trazas(quien.usuario.id)).toHaveLength(0);
  });
});
