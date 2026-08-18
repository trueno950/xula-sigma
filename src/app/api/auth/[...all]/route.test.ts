import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const manejarAuth = vi.hoisted(() => vi.fn());
const limitarRitmo = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ manejarAuth }));

/**
 * La ruta limita el ritmo antes de delegar, asi que hay que darle un
 * limitador y un tenant aunque este archivo pruebe otra cosa. Lo que el
 * limitador hace tiene sus propios tests en `ritmoDeLaRuta.test.ts`.
 */
vi.mock("@/shared/auth/limitarRitmo", () => ({ limitarRitmo }));
vi.mock("@/shared/tenancy/contexto", () => ({
  ayuntamientoActual: async () => ({
    id: "11111111-1111-1111-1111-111111111111",
  }),
}));

const { POST } = await import("./route");

const peticion = () =>
  new Request("http://motul.localhost:3000/api/auth/sign-in/email", {
    method: "POST",
  });

/**
 * El spy se limpia en cada test. Sin esto `mock.calls` acumula entre tests
 * y una asercion sobre `calls[0]` mira la llamada de OTRO test: el de la
 * fuga de correo pasaba siempre, incluso con el saneador desactivado.
 * Verificado provocandolo.
 */
let registro: ReturnType<typeof vi.spyOn>;

describe("borde de error de la ruta de auth", () => {
  beforeEach(() => {
    manejarAuth.mockReset();
    limitarRitmo.mockReset();
    limitarRitmo.mockResolvedValue(undefined);
    registro = vi.spyOn(console, "error").mockImplementation(() => {});
    registro.mockClear();
  });

  afterEach(() => {
    registro.mockRestore();
  });

  it("deja pasar la respuesta cuando no hay error", async () => {
    manejarAuth.mockResolvedValue(Response.json({ ok: true }, { status: 200 }));

    const respuesta = await POST(peticion());

    expect(respuesta.status).toBe(200);
  });

  it("convierte una excepcion en 500", async () => {
    manejarAuth.mockRejectedValue(new Error("lo que sea"));

    expect((await POST(peticion())).status).toBe(500);
  });

  it("no deja salir el motivo de una violacion de RLS", async () => {
    /**
     * El caso que importa. Ese texto nombra la tabla y delata que hay
     * aislamiento por fila: alcanza con provocar el error para leer el
     * esquema.
     */
    const motivo =
      'new row violates row-level security policy for table "usuarios"';
    manejarAuth.mockRejectedValue(new Error(motivo));

    const respuesta = await POST(peticion());
    const cuerpo = await respuesta.text();

    expect(respuesta.status).toBe(500);
    expect(cuerpo).not.toContain("row-level security");
    expect(cuerpo).not.toContain("usuarios");
  });

  it("no deja salir el nombre de una columna ni el valor que fallo", async () => {
    manejarAuth.mockRejectedValue(
      new Error('null value in column "rol" of relation "usuarios"'),
    );

    const cuerpo = await (await POST(peticion())).text();

    expect(cuerpo).not.toContain("rol");
    expect(cuerpo).not.toContain("relation");
  });

  it("registra del lado del servidor lo que sirve para arreglarlo", async () => {
    manejarAuth.mockRejectedValue(
      Object.assign(new Error("null value in column"), {
        name: "PostgresError",
        code: "23502",
        table_name: "usuarios",
      }),
    );

    await POST(peticion());

    // Se pierde para el cliente, no para quien opera el sistema.
    expect(console.error).toHaveBeenCalledWith(
      "[auth] fallo no manejado",
      expect.objectContaining({
        campos: expect.objectContaining({
          code: "23502",
          table_name: "usuarios",
        }),
      }),
    );
  });

  it("no registra el correo que Postgres incrusta en el error", async () => {
    /**
     * El log no tiene RLS ni bitacora de acceso. Un correo ahi queda
     * expuesto para siempre y sin registro de quien lo leyo.
     */
    manejarAuth.mockRejectedValue(
      Object.assign(
        new Error(
          "duplicate key value violates unique constraint\n" +
            "Key (email)=(tesoreria@example.com) already exists.",
        ),
        { name: "PostgresError", code: "23505" },
      ),
    );

    await POST(peticion());

    // `at(-1)`, no `[0]`: la de esta prueba es la ultima, no la primera.
    expect(registro).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(registro.mock.calls.at(-1))).not.toContain(
      "tesoreria@example.com",
    );
  });
});
