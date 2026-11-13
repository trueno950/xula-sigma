import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { darDeBajaUsuario } from "./administracionDeUsuarios";
import { usuarios } from "./esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "./genteDePrueba";

/**
 * B2 de la verificacion de T1: el municipio tiene un solo administrador
 * (decision del usuario, S3), asi que darse de baja a si mismo lo deja sin
 * nadie que lo administre. Ninguna ruta limpia `bajaEn`: el SUPER_ADMIN solo
 * restablece contrasenias, no reactiva cuentas. Es un bloqueo permanente y
 * por eso la baja de la propia cuenta se rechaza en el caso de uso, no solo
 * en la pantalla.
 */

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("darDeBajaUsuario sobre la propia cuenta", () => {
  it("el ADMIN_MUNICIPAL no puede darse de baja: dejaria al municipio sin nadie que lo administre", async () => {
    const quien = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

    const fallo = await motivoDe(() =>
      darDeBajaUsuario(quien, { usuarioId: quien.usuario.id }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");

    const [fila] = await withTenant(motul, (tx) =>
      tx.select().from(usuarios).where(eq(usuarios.id, quien.usuario.id)),
    );

    expect(fila?.bajaEn).toBeNull();
  });
});
