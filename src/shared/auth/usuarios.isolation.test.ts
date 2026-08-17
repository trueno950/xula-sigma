import { eq, sql } from "drizzle-orm";
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
import { usuarios } from "./esquema";
import type { Rol } from "./roles";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa
 * 2): dos municipios con datos, contexto en uno, consulta **sin filtro**, y
 * verificar que del otro no aparece nada.
 *
 * La garantia la da RLS y RLS solo existe en Postgres: esto no se simula.
 */

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

describe("aislamiento de usuarios", () => {
  it("una consulta sin filtro solo devuelve el usuario del tenant activo", async () => {
    // Sin `where`. A proposito: si el aislamiento dependiera de que el
    // programador se acuerde de filtrar, no seria aislamiento.
    const filas = await withTenant(motul, (tx) => tx.select().from(usuarios));

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.id).toBe(semillas.enMotul.usuarioId);
  });

  it("el id de un usuario de Ticul no resuelve bajo Motul", async () => {
    // El id existe y es correcto. Lo unico que lo esconde es el tenant.
    const filas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, semillas.enTicul.usuarioId)),
    );

    expect(filas).toHaveLength(0);
  });

  it("el mismo correo en los dos municipios son dos usuarios distintos", async () => {
    // La siembra usa el MISMO correo en ambos. Que las dos filas existan y
    // tengan ids distintos es la prueba de que la unicidad es compuesta
    // (`ayuntamiento_id`, `email`) y no global.
    expect(semillas.enMotul.usuarioId).not.toBe(semillas.enTicul.usuarioId);
  });

  it("no se puede dar de alta un usuario a nombre de otro municipio", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(usuarios).values({
          ayuntamientoId: ticul,
          name: "Infiltrado",
          email: "infiltrado@example.com",
          rol: "OPERADOR",
        }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });

  it("un usuario no se puede borrar desde la aplicacion: la baja es logica", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.execute(sql`DELETE FROM usuarios WHERE ayuntamiento_id = ${motul}`),
      ),
    );

    // No lo frena una politica sino la ausencia del GRANT. Un permiso que
    // no existe no se puede olvidar de revisar. Borrar la fila dejaria
    // huerfanas las constancias que esa persona firmo.
    expect(motivo).toMatch(/permission denied/i);
  });

  it("un rol fuera del conjunto no entra, aunque se evada el tipo", async () => {
    // El cast simula el `as Rol` de alguien apurado, o un valor que llega
    // de afuera sin validar. `rol` es la frontera de autorizacion: como
    // texto libre, un `"Operador"` mal tipeado crearia una persona con
    // permisos equivocados sin que nada falle.
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(usuarios).values({
          ayuntamientoId: motul,
          name: "Rol Invalido",
          email: "rol-invalido@example.com",
          rol: "Operador" as Rol,
        }),
      ),
    );

    expect(motivo).toMatch(/usuarios_rol_valido/i);
  });
});
