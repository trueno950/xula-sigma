import { renderToStaticMarkup } from "react-dom/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  notFound: vi.fn(),
}));

/** El `notFound` real de Next lanza; el mock de prueba tambien. */
const NOT_FOUND = "NEXT_NOT_FOUND";

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/shared/auth", () => ({
  contextoActual: mocks.contextoActual,
}));

const { default: PaginaDeZonas } = await import(
  "@/app/(panel)/territorio/zonas/page"
);

import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoZonaId,
} from "./domain";
import {
  calles,
  callesDeZonas,
  domicilios,
  lugares,
  zonas,
} from "./infrastructure/esquema";

const raizMotul = comoLugarId("10000000-2222-4222-8222-000000000001");
const calleMotul = comoCalleId("20000000-2222-4222-8222-000000000001");
const zonaMotul = comoZonaId("30000000-2222-4222-8222-000000000001");
const raizTicul = comoLugarId("10000000-2222-4222-8222-000000000002");
const zonaTicul = comoZonaId("30000000-2222-4222-8222-000000000002");
const inexistente = comoZonaId("60000000-1111-4111-8111-111111111111");

beforeAll(async () => {
  await sembrar();

  await withTenant(motul, async (tx) => {
    await tx.insert(lugares).values({
      id: raizMotul,
      ayuntamientoId: motul,
      tipo: "comisaria",
      nombre: "Raiz UI Motul",
    });
    await tx.insert(calles).values({
      id: calleMotul,
      ayuntamientoId: motul,
      lugarId: raizMotul,
      nombre: "Calle Veintiuno",
    });
    await tx.insert(domicilios).values({
      id: comoDomicilioId("50000000-2222-4222-8222-000000000001"),
      ayuntamientoId: motul,
      lugarId: raizMotul,
      calleId: calleMotul,
      numero: "7",
    });
    await tx.insert(zonas).values({
      id: zonaMotul,
      ayuntamientoId: motul,
      lugarId: raizMotul,
      nombre: "Centro",
    });
    await tx.insert(callesDeZonas).values({
      ayuntamientoId: motul,
      lugarId: raizMotul,
      zonaId: zonaMotul,
      calleId: calleMotul,
    });
  });

  await withTenant(ticul, async (tx) => {
    await tx.insert(lugares).values({
      id: raizTicul,
      ayuntamientoId: ticul,
      tipo: "comisaria",
      nombre: "Raiz UI Ticul",
    });
    await tx.insert(zonas).values({
      id: zonaTicul,
      ayuntamientoId: ticul,
      lugarId: raizTicul,
      nombre: "Ajena",
    });
  });
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: motul,
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  mocks.notFound.mockImplementation(() => {
    throw new Error(NOT_FOUND);
  });
});

const pagina = (searchParams: Record<string, string>) =>
  PaginaDeZonas({ searchParams: Promise.resolve(searchParams) });

const paginaInexistente = (searchParams: Record<string, string>) =>
  expect(pagina(searchParams)).rejects.toThrow(NOT_FOUND);

describe("ruta /territorio/zonas (B3u-RED-01)", () => {
  it("responde 404 ante un ?zona inexistente", async () => {
    await paginaInexistente({ zona: inexistente });
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("responde 404 ante un ?zona de otro tenant, nunca 403 ni lista vacia", async () => {
    await paginaInexistente({ zona: zonaTicul });
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("responde 404 ante un ?zona invalido", async () => {
    await paginaInexistente({ zona: "no-soy-un-uuid" });
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("responde 404 ante un ?raiz de otro tenant y ante uno invalido", async () => {
    await paginaInexistente({ raiz: raizTicul });
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
    await paginaInexistente({ raiz: "tampoco-uuid" });
    expect(mocks.notFound).toHaveBeenCalledTimes(2);
  });

  it("lista solo las zonas del municipio con su asentamiento", async () => {
    const marcado = renderToStaticMarkup(await pagina({}));
    expect(marcado).toContain("Centro");
    expect(marcado).toContain("Raiz UI Motul");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("muestra el detalle con calles y domicilios derivados", async () => {
    const marcado = renderToStaticMarkup(await pagina({ zona: zonaMotul }));
    expect(marcado).toContain("Centro");
    expect(marcado).toContain("Calle Veintiuno");
    expect(marcado).toContain("7");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});
