import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { altaDePersona } from "@/shared/auth/alta";
import { usuarios } from "@/shared/auth/esquema";
import { bitacora } from "./esquema";
import { limpiar, motivoDeFalla, owner } from "./municipiosDePrueba";
import { cerrarProvision, withAltaDeAyuntamiento } from "./provision";
import { cerrarConexion, withTenant } from "./withTenant";

/**
 * El alta de un municipio corre bajo `xula_super_admin`, un rol distinto de
 * `xula_app` y de `xula_migrator`. Lo que puede hacer no lo decide este
 * archivo sino las politicas de `0002_super_admin.sql`, y por eso los tests
 * que importan son los que **provocan** lo que no puede.
 *
 * `*.isolation.test.ts` y no `*.integration`: lo que se verifica es que un
 * rol de Postgres no alcance filas que no le tocan, que es exactamente lo
 * que nombra esa suite.
 */

const PRIMER_ADMIN = {
  nombre: "Primera Administradora",
  email: "admin@example.com",
  clave: "clave-larga-y-buena",
} as const;

afterEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await cerrarProvision();
  await cerrarConexion();
  await owner.end();
});

describe("withAltaDeAyuntamiento", () => {
  it("crea el ayuntamiento y su primer ADMIN_MUNICIPAL", async () => {
    const id = await withAltaDeAyuntamiento(
      { subdominio: "chocholá", nombre: "Chocholá" },
      async (tx, ayuntamientoId) => {
        await altaDePersona(tx, ayuntamientoId, {
          ...PRIMER_ADMIN,
          rol: "ADMIN_MUNICIPAL",
        });

        return ayuntamientoId;
      },
    );

    const [municipio] = await owner`
      SELECT subdominio, es_plataforma FROM ayuntamientos WHERE id = ${id}
    `;

    expect(municipio?.subdominio).toBe("chocholá");
    expect(municipio?.es_plataforma).toBe(false);

    // Por `withTenant`, o sea con el rol de la aplicacion: la persona no
    // solo existe, existe para el municipio que la va a usar.
    const gente = await withTenant(id, (tx) => tx.select().from(usuarios));

    expect(gente).toHaveLength(1);
    expect(gente[0]?.rol).toBe("ADMIN_MUNICIPAL");
  });

  it("si falla el administrador no queda el ayuntamiento huerfano", async () => {
    /**
     * El escenario del spec: datos validos de municipio, invalidos de
     * administrador. Un municipio sin nadie que pueda entrar es un municipio
     * que hay que arreglar a mano en la base.
     */
    await motivoDeFalla(() =>
      withAltaDeAyuntamiento(
        { subdominio: "oxkutzcab", nombre: "Oxkutzcab" },
        (tx, ayuntamientoId) =>
          altaDePersona(tx, ayuntamientoId, {
            ...PRIMER_ADMIN,
            clave: "corta",
            rol: "ADMIN_MUNICIPAL",
          }),
      ),
    );

    const quedaron = await owner`
      SELECT id FROM ayuntamientos WHERE subdominio = 'oxkutzcab'
    `;

    expect(quedaron).toHaveLength(0);
  });

  it("no puede crear a nadie que no sea ADMIN_MUNICIPAL", async () => {
    /**
     * Por la API entera. **Dos politicas cubren este camino**, no una:
     * `usuarios_alta_admin` en el `WITH CHECK` del INSERT, y
     * `usuarios_lectura_admin` en el `RETURNING` que hace `altaDePersona`
     * —un `INSERT ... RETURNING` aplica tambien las politicas de SELECT.
     *
     * Los dos fallos dan **el mismo mensaje** de Postgres, verificado:
     * `new row violates row-level security policy for table "usuarios"`.
     * Asi que este test dice que el camino esta cerrado, no cual de las dos
     * lo cierra. Al `WITH CHECK` lo aisla el test de abajo.
     */
    const motivo = await motivoDeFalla(() =>
      withAltaDeAyuntamiento(
        { subdominio: "mani", nombre: "Maní" },
        (tx, ayuntamientoId) =>
          altaDePersona(tx, ayuntamientoId, {
            ...PRIMER_ADMIN,
            rol: "OPERADOR",
          }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);

    const quedaron = await owner`
      SELECT id FROM ayuntamientos WHERE subdominio = 'mani'
    `;

    expect(quedaron).toHaveLength(0);
  });

  it("tampoco un SUPER_ADMIN", async () => {
    const motivo = await motivoDeFalla(() =>
      withAltaDeAyuntamiento(
        { subdominio: "tekax", nombre: "Tekax" },
        (tx, ayuntamientoId) =>
          altaDePersona(tx, ayuntamientoId, {
            ...PRIMER_ADMIN,
            rol: "SUPER_ADMIN",
          }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });

  it("deja traza del alta en bitacora sin que el llamador la escriba", async () => {
    /**
     * **El callback no inserta nada en bitacora**, y ese es el punto.
     *
     * La version anterior de este test escribia la traza adentro del propio
     * `trabajo` y despues afirmaba encontrarla: probaba que podia leer una
     * fila que el mismo habia puesto. Quedaba verde con
     * `withAltaDeAyuntamiento` sin escribir una sola traza — que era
     * exactamente el estado del codigo.
     *
     * La traza tiene que salir del alta misma. Si dependiera de que cada
     * llamador se acuerde de escribirla, el dia que uno se olvide no falla
     * nada y el municipio aparece sin registro de haber sido creado.
     */
    const id = await withAltaDeAyuntamiento(
      { subdominio: "muna", nombre: "Muna" },
      async (tx, ayuntamientoId) => {
        await altaDePersona(tx, ayuntamientoId, {
          ...PRIMER_ADMIN,
          rol: "ADMIN_MUNICIPAL",
        });

        return ayuntamientoId;
      },
    );

    const trazas = await withTenant(id, (tx) =>
      tx.select().from(bitacora).where(eq(bitacora.entidadId, id)),
    );

    expect(trazas).toHaveLength(1);
    expect(trazas[0]?.accion).toBe("ALTA_AYUNTAMIENTO");
    expect(trazas[0]?.entidad).toBe("ayuntamientos");
    expect(trazas[0]?.ocurridoEn).toBeInstanceOf(Date);

    /**
     * Nulo a proposito: en este punto no hay persona identificada. Quien
     * corre el provisionamiento es la plataforma, y el primer
     * `ADMIN_MUNICIPAL` todavia no existe cuando se escribe la traza. El
     * esquema ya reserva `actor` nulo para lo que origina el sistema.
     */
    expect(trazas[0]?.actor).toBeNull();
  });
});
