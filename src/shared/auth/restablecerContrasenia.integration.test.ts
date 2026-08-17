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
import { verificarClave } from "./contrasenia";
import { cuentas } from "./esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "./genteDePrueba";

/**
 * Contra Postgres y no con puertos mockeados: la garantia que importa aca
 * la da RLS, no el codigo. Que un usuario de otro municipio responda
 * `NO_ENCONTRADO` no es una comparacion en TypeScript —no hay ningun
 * `WHERE ayuntamiento_id` en el caso de uso— sino la politica de la tabla
 * acotando el `SELECT`. Un doble de prueba lo daria por sentado.
 */

const CLAVE_NUEVA = "clave-larga-y-nueva";

let gente: GentePorMunicipio;

const actor = (
  municipio: "motul" | "ticul",
  rol: Parameters<typeof contextoDe>[2],
) => contextoDe(gente, municipio, rol);

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

describe("restablecerContrasenia", () => {
  it("ADMIN_MUNICIPAL restablece a su OPERADOR", async () => {
    const objetivo = gente.motul.OPERADOR;

    await restablecerContrasenia(actor("motul", "ADMIN_MUNICIPAL"), {
      usuarioId: objetivo,
      nuevaClave: CLAVE_NUEVA,
    });

    expect(await verificarClave(await claveDe(objetivo), CLAVE_NUEVA)).toBe(
      true,
    );
  });

  it("OPERADOR no administra usuarios", async () => {
    const objetivo = gente.motul.CONSULTA;
    const antes = await claveDe(objetivo);

    const fallo = await motivoDe(() =>
      restablecerContrasenia(actor("motul", "OPERADOR"), {
        usuarioId: objetivo,
        nuevaClave: CLAVE_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect(await claveDe(objetivo)).toBe(antes);
  });

  it("SUPER_ADMIN no restablece a un OPERADOR", async () => {
    const objetivo = gente.motul.CONSULTA;
    const antes = await claveDe(objetivo);

    const fallo = await motivoDe(() =>
      restablecerContrasenia(actor("motul", "SUPER_ADMIN"), {
        usuarioId: objetivo,
        nuevaClave: CLAVE_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect(await claveDe(objetivo)).toBe(antes);
  });

  /**
   * **Prueba la regla de `roles.ts`, no el camino real del SUPER_ADMIN.**
   *
   * El actor se fabrica con `ayuntamientoId` de Motul, y ese SUPER_ADMIN no
   * existe en produccion: vive en el ayuntamiento reservado. Con ese
   * contexto el UPDATE corre por `withTenant` bajo `xula_app`, que tiene
   * `GRANT UPDATE` sobre `cuentas`, y **nunca toca**
   * `cuentas_restablece_admin` ni el rol `xula_super_admin`. Este test
   * quedaria verde aunque esa politica se borrara.
   *
   * Lo que si demuestra es que `puedeRestablecerContrasenia` deja pasar al
   * SUPER_ADMIN sobre un ADMIN_MUNICIPAL. El camino de produccion no esta
   * cableado todavia: ver tarea 4.16.
   */
  it("la regla deja al SUPER_ADMIN restablecer a un ADMIN_MUNICIPAL", async () => {
    const objetivo = gente.motul.ADMIN_MUNICIPAL;

    await restablecerContrasenia(actor("motul", "SUPER_ADMIN"), {
      usuarioId: objetivo,
      nuevaClave: CLAVE_NUEVA,
    });

    expect(await verificarClave(await claveDe(objetivo), CLAVE_NUEVA)).toBe(
      true,
    );
  });

  it("un usuario de otro municipio es NO_ENCONTRADO, no NO_AUTORIZADO", async () => {
    /**
     * El caso que separa 404 de 403. El actor tiene el rol que alcanza, asi
     * que si la verificacion de rol corriera antes que la resolucion del
     * recurso el resultado seria 403, y ese 403 confirma que la persona
     * existe en Ticul.
     */
    const fallo = await motivoDe(() =>
      restablecerContrasenia(actor("motul", "ADMIN_MUNICIPAL"), {
        usuarioId: gente.ticul.OPERADOR,
        nuevaClave: CLAVE_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_ENCONTRADO");
  });

  it("un rol sin permiso sobre un usuario ajeno tambien es NO_ENCONTRADO", async () => {
    /**
     * El que caza de verdad el orden invertido. Con la verificacion de rol
     * primero, el caso de arriba sigue verde —`ADMIN_MUNICIPAL` la pasa— y
     * este responde `NO_AUTORIZADO`: el codigo de error se vuelve un oraculo
     * de en que municipio vive cada id.
     */
    const fallo = await motivoDe(() =>
      restablecerContrasenia(actor("motul", "CONSULTA"), {
        usuarioId: gente.ticul.OPERADOR,
        nuevaClave: CLAVE_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_ENCONTRADO");
  });

  it("deja traza en bitacora con actor y afectado", async () => {
    const quien = actor("motul", "ADMIN_MUNICIPAL");
    const objetivo = gente.motul.CONSULTA;

    await restablecerContrasenia(quien, {
      usuarioId: objetivo,
      nuevaClave: CLAVE_NUEVA,
    });

    const trazas = await trazasDe(objetivo);

    expect(trazas).toHaveLength(1);
    expect(trazas[0]?.actor).toBe(quien.usuario.id);
    expect(trazas[0]?.ayuntamientoId).toBe(motul);
  });

  it("una operacion rechazada no cambia la clave ni deja traza", async () => {
    /**
     * **Lo que este test NO prueba:** que la traza y el cambio compartan
     * transaccion. Se intentaron tres mutaciones para falsearlo —bitacora en
     * otra transaccion, el fallo tragado con un `catch`, y el orden de las
     * escrituras invertido— y las tres quedaron verdes, porque la traza es
     * la ultima escritura y Postgres aborta la transaccion entera al primer
     * statement que falla. Un test que no puede fallar es peor que ninguno,
     * asi que aca se afirma solo lo que si se verifica.
     */
    const objetivo = gente.motul.SUPER_ADMIN;
    const antes = await claveDe(objetivo);

    const fallo = await motivoDe(() =>
      restablecerContrasenia(actor("motul", "ADMIN_MUNICIPAL"), {
        usuarioId: objetivo,
        nuevaClave: CLAVE_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect(await claveDe(objetivo)).toBe(antes);
    expect(await trazasDe(objetivo)).toHaveLength(0);
  });
});
