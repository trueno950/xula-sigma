import { and, eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { usuarios } from "@/shared/auth/esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";

/**
 * S12 de `usuarios-ux` en el borde y contra Postgres: la baja pide una
 * casilla, la accion la vuelve a exigir y **sin ella no cambia nada** —la
 * cuenta sigue activa y la bitacora no registra una baja que no ocurrio—.
 * Con la casilla marcada la baja es la de siempre.
 *
 * Vive en la raiz del modulo y no bajo `ui/` porque importa la accion y el
 * esquema reales a la vez; es el mismo molde que `altaDeUsuario.integration`
 * y `correoUnico.integration`.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Fuera de un request no hay almacen de cookies: `next/headers` tiraria y el
// aviso de S13 caeria en su camino sin aviso. Se simula el almacen.
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn() }),
}));

const { darDeBajaUsuarioAction } = await import(
  "./ui/actions/darDeBajaUsuarioAction"
);

let gente: GentePorMunicipio;

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

const destino = () => String(redirectMock.mock.calls.at(-1)?.[0] ?? "");

const errorDelDestino = () => {
  const url = destino();
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get("error");
};

const filaDe = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)),
  ).then(([fila]) => fila);

const trazasDeBaja = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "BAJA_USUARIO"),
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

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
});

describe("darDeBajaUsuarioAction y la casilla de confirmacion", () => {
  it("sin la casilla la cuenta sigue activa y no hay baja en la bitacora", async () => {
    const objetivo = gente.motul.OPERADOR;

    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: objetivo })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("baja-sin-confirmar");
    expect((await filaDe(objetivo))?.bajaEn).toBeNull();
    expect(await trazasDeBaja(objetivo)).toHaveLength(0);
  });

  it("con la casilla la baja ocurre como antes", async () => {
    const objetivo = gente.motul.CONSULTA;

    await expect(
      darDeBajaUsuarioAction(
        formulario({ usuarioId: objetivo, confirmar: "si" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    // S13 y S14: el aviso viaja en una cookie y la URL lleva solo su token.
    expect(destino()).toMatch(/^\/usuarios\?aviso=[0-9a-f-]+&ok=baja$/);
    expect((await filaDe(objetivo))?.bajaEn).toBeInstanceOf(Date);
    expect(await trazasDeBaja(objetivo)).toHaveLength(1);
  });
});
