import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
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
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "@/shared/tenancy/cabeceras";
import { ayuntamientos, bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  subdominioMotul,
  subdominioTicul,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";

/**
 * La descarga completa contra la base real, con dos municipios sembrados.
 *
 * Lo que solo la base puede probar: que el ZIP salga con las filas de un
 * municipio y ninguna del otro, y que la exportacion quede en la bitacora
 * una vez, con el rol que la autorizo. Se mockean los tres bordes que en un
 * request real pone la plataforma —cabeceras del proxy, sesion y
 * almacenamiento de objetos—; `exportarAyuntamiento`, las porciones y RLS
 * corren de verdad.
 */

const cabecerasMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const leerEscudoMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: cabecerasMock }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/marca/composicion", () => ({
  lectorDeEscudo: { leer: leerEscudoMock },
}));

const { GET } = await import("./route");

let gente: GentePorMunicipio;
let carpeta = "";
let rutaDelZip = "";

const ESCUDO = new TextEncoder().encode("escudo-de prueba");

const adminDe = (municipio: "motul" | "ticul") =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

/** Las cabeceras que escribiria `proxy.ts`: `exigirAyuntamiento` resuelve de verdad. */
const conCabeceras = (subdominio: string) => {
  cabecerasMock.mockResolvedValue({
    get: (nombre: string) => {
      if (nombre === CABECERA_SUPERFICIE) return "ayuntamiento";
      return nombre === CABECERA_SUBDOMINIO ? subdominio : null;
    },
  });
};

const trazasDeExportacion = async (ayuntamiento: typeof motul) =>
  withTenant(ayuntamiento, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.accion, "EXPORTAR_AYUNTAMIENTO")),
  );

const marcaDe = (ayuntamiento: typeof motul, marca: Record<string, unknown>) =>
  withTenant(ayuntamiento, (tx) =>
    tx
      .update(ayuntamientos)
      .set({ marca })
      .where(eq(ayuntamientos.id, ayuntamiento)),
  );

const zipDe = async (respuesta: Response, nombre: string): Promise<void> => {
  rutaDelZip = join(carpeta, nombre);
  writeFileSync(rutaDelZip, new Uint8Array(await respuesta.arrayBuffer()));
  const salida = execFileSync("unzip", ["-t", rutaDelZip], {
    encoding: "utf8",
  });

  expect(salida).toContain("No errors detected");
};

const archivoDe = (nombre: string): string =>
  execFileSync("unzip", ["-p", rutaDelZip, nombre], { encoding: "utf8" });

beforeAll(async () => {
  carpeta = mkdtempSync(join(tmpdir(), "xula-descarga-"));
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  vi.clearAllMocks();
  leerEscudoMock.mockResolvedValue(ESCUDO);
  await marcaDe(motul, {});
  await marcaDe(ticul, {});
});

afterAll(async () => {
  rmSync(carpeta, { recursive: true, force: true });
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("GET /exportacion/descarga contra la base", () => {
  it("el ADMIN_MUNICIPAL de Motul baja un ZIP con sus filas, su escudo y su traza", async () => {
    const escudo = "https://assets.prueba.local/motul/escudo-x.png";
    await marcaDe(motul, { escudo });
    conCabeceras(subdominioMotul);
    contextoActualMock.mockResolvedValue(adminDe("motul"));

    const respuesta = await GET();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("application/zip");
    expect(respuesta.headers.get("Content-Disposition")).toMatch(
      new RegExp(
        `^attachment; filename="${subdominioMotul}-\\d{4}-\\d{2}-\\d{2}\\.zip"$`,
      ),
    );

    await zipDe(respuesta, "motul.zip");

    expect(archivoDe("usuarios.csv")).toContain("@motul.example.com");
    expect(archivoDe("usuarios.csv")).not.toContain("@ticul.example.com");
    expect(JSON.parse(archivoDe("manifiesto.json")).subdominio).toBe(
      subdominioMotul,
    );
    // El escudo viaja en el ZIP y la lectura fue la de Motul, no otra.
    expect(leerEscudoMock).toHaveBeenCalledWith(motul, escudo);
    expect(archivoDe("escudo.png")).toBe("escudo-de prueba");
    expect(await trazasDeExportacion(motul)).toHaveLength(1);
    expect(await trazasDeExportacion(ticul)).toHaveLength(0);
  });

  it("el municipio sin escudo recibe el ZIP sin escudo.png", async () => {
    conCabeceras(subdominioTicul);
    contextoActualMock.mockResolvedValue(adminDe("ticul"));

    const respuesta = await GET();

    await zipDe(respuesta, "ticul.zip");

    expect(archivoDe("usuarios.csv")).toContain("@ticul.example.com");
    expect(leerEscudoMock).not.toHaveBeenCalled();
    expect(
      execFileSync("unzip", ["-l", rutaDelZip], { encoding: "utf8" }),
    ).not.toContain("escudo.png");
    expect(await trazasDeExportacion(ticul)).toHaveLength(1);
  });

  it("un OPERADOR recibe 403, sin ZIP y sin dejar traza", async () => {
    const antes = (await trazasDeExportacion(motul)).length;
    conCabeceras(subdominioMotul);
    contextoActualMock.mockResolvedValue(
      contextoDe(gente, "motul", "OPERADOR"),
    );

    const respuesta = await GET();

    expect(respuesta.status).toBe(403);
    // El cuerpo es el mensaje para la operadora, no un ZIP: el archivo no
    // existe y no debe parecer que si.
    expect(await respuesta.text()).toBe(
      "Su rol no tiene permiso para descargar los datos del ayuntamiento.",
    );
    expect(await trazasDeExportacion(motul)).toHaveLength(antes);
  });
});
