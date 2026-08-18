import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { type SemillasAuth, sembrarAuth } from "./datosDePrueba";
import { sesiones } from "./esquema";

let semillas: SemillasAuth;

beforeAll(async () => {
  await sembrar();
  semillas = await sembrarAuth();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de sesiones", () => {
  it("una consulta sin filtro solo devuelve la sesion del tenant activo", async () => {
    const filas = await withTenant(motul, (tx) => tx.select().from(sesiones));

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.id).toBe(semillas.enMotul.sesionId);
  });

  it("el token de sesion de Ticul no resuelve bajo Motul", async () => {
    /**
     * Es el escenario T9 visto desde la base: la cookie de un municipio
     * presentada al otro. El navegador ya no la manda —la cookie es por
     * subdominio— pero si alguien la copiara a mano, la busqueda por token
     * tampoco encuentra nada. Dos rejas, no una.
     */
    const filas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(sesiones)
        .where(eq(sesiones.token, semillas.enTicul.sesionToken)),
    );

    expect(filas).toHaveLength(0);
  });

  it("no se puede abrir una sesion a nombre de otro municipio", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(sesiones).values({
          ayuntamientoId: ticul,
          userId: semillas.enMotul.usuarioId,
          token: "token-infiltrado",
          expiresAt: new Date(Date.now() + 3_600_000),
        }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });

  it("una sesion de Motul no puede apuntar a un usuario de Ticul", async () => {
    /**
     * El caso que los otros cuatro no cubren: `ayuntamiento_id` **propio**
     * —o sea que pasa el `WITH CHECK` de RLS— con `user_id` ajeno.
     *
     * RLS no lo ve: solo compara el tenant de la fila contra el activo, y
     * ahi coinciden. Lo tiene que impedir la FK compuesta contra
     * `usuarios(id, ayuntamiento_id)`. Con la FK de una sola columna la
     * base aceptaba la fila sin chistar.
     */
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(sesiones).values({
          ayuntamientoId: motul,
          userId: semillas.enTicul.usuarioId,
          token: "token-de-usuario-ajeno",
          expiresAt: new Date(Date.now() + 3_600_000),
        }),
      ),
    );

    expect(motivo).toMatch(/foreign key|sesiones_usuario_tenant_fk/i);
  });

  it("cerrar sesion desde Motul no borra la sesion de Ticul", async () => {
    // `sesiones` SI tiene GRANT de DELETE: cerrar sesion es borrar la fila.
    // Por eso el borrado cruzado no falla — simplemente no alcanza ninguna
    // fila, que es el resultado correcto y el mas facil de leer mal.
    await withTenant(motul, (tx) =>
      tx
        .delete(sesiones)
        .where(eq(sesiones.token, semillas.enTicul.sesionToken)),
    );

    const sigueViva = await withTenant(ticul, (tx) =>
      tx
        .select()
        .from(sesiones)
        .where(eq(sesiones.token, semillas.enTicul.sesionToken)),
    );

    expect(sigueViva).toHaveLength(1);
  });
});
