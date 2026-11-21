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
import { cuentas } from "./esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "./genteDePrueba";

/**
 * S1 de `usuarios-ux`: el administrador no restablece su propia contrasenia
 * — el servidor la rechaza y la fila propia no ofrece el boton. Lo que se
 * afirma aca es lo que la pantalla no puede garantizar: sin el boton, un
 * POST a mano a la Server Action sigue llegando, y la guarda que lo frena
 * vive en el caso de uso.
 *
 * Contra Postgres y no con dobles, por la misma razon que el resto de los
 * tests de este archivo hermano: la credencial y la bitacora se leen como
 * quedaron de verdad, y una operacion rechazada no deja ni la una ni la
 * otra.
 */

const CLAVE_NUEVA = "clave-larga-y-nueva";

let gente: GentePorMunicipio;

const claveDe = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([credencial]) => credencial?.password as string);

const trazasDe = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "RESTABLECER_CONTRASENIA"),
          eq(bitacora.entidadId, usuarioId),
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

describe("restablecerContrasenia sobre la propia cuenta", () => {
  it("el ADMIN_MUNICIPAL no restablece su propia contrasena: no cambia la credencial ni deja traza", async () => {
    const quien = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const antes = await claveDe(quien.usuario.id);

    const fallo = await motivoDe(() =>
      restablecerContrasenia(quien, {
        usuarioId: quien.usuario.id,
        nuevaClave: CLAVE_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("RESTABLECIMIENTO_PROPIO");
    expect(await claveDe(quien.usuario.id)).toBe(antes);
    expect(await trazasDe(quien.usuario.id)).toHaveLength(0);
  });
});
