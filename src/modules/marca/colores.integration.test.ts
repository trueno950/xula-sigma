import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearAlmacenDePrueba } from "./application/almacenDePrueba";
import { crearCambiarColores } from "./application/cambiarColores";
import { crearCambiarEscudo } from "./application/cambiarEscudo";
import { crearRestablecerColores } from "./application/restablecerColores";
import { escribirMarca, marcaDe, pngValido } from "./escudoDePrueba";
import { repositorioDeMarcaSql } from "./infrastructure/repositorioDeMarcaSql";

/**
 * El camino de escritura de los colores contra Postgres real, y la
 * composicion que comparten con el escudo (S7): cada escritura conserva lo
 * que la otra dejo.
 *
 * Sin dobles salvo el almacen, igual que `cambiarEscudo.integration.test.ts`
 * y por la misma razon: `RepositorioDeMarca` no tiene implementacion de
 * prueba, `repositorioDeMarcaSql` es la unica.
 */

const ESCUDO_PREVIO = "https://assets.prueba.local/motul/escudo-previo.png";
const GUINDA = "oklch(0.42 0.12 25)";
const ORO = "#ffd700";

let gente: GentePorMunicipio;

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

const cambiarColores = crearCambiarColores(repositorioDeMarcaSql);
const restablecerColores = crearRestablecerColores(repositorioDeMarcaSql);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await escribirMarca({});
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("cambiarColores", () => {
  it("guarda el primario y el secundario, y el texto del primario lo elige el servidor", async () => {
    const resultado = await cambiarColores(
      { primario: GUINDA, secundario: ORO },
      actor("ADMIN_MUNICIPAL"),
    );

    expect(resultado).toEqual({
      primario: GUINDA,
      primarioTexto: "#ffffff",
      secundario: ORO,
    });

    expect(await marcaDe()).toEqual({
      primario: GUINDA,
      primarioTexto: "#ffffff",
      secundario: ORO,
    });
  });

  it("un primario claro se guarda con texto negro", async () => {
    await cambiarColores(
      { primario: ORO, secundario: GUINDA },
      actor("ADMIN_MUNICIPAL"),
    );

    expect((await marcaDe())?.primarioTexto).toBe("#000000");
  });

  it("guardar colores conserva el escudo que ya estaba", async () => {
    await escribirMarca({ escudo: ESCUDO_PREVIO });

    await cambiarColores(
      { primario: GUINDA, secundario: ORO },
      actor("ADMIN_MUNICIPAL"),
    );

    expect((await marcaDe())?.escudo).toBe(ESCUDO_PREVIO);
  });

  it("cambiar el escudo conserva los colores que ya estaban", async () => {
    await cambiarColores(
      { primario: GUINDA, secundario: ORO },
      actor("ADMIN_MUNICIPAL"),
    );

    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);
    const { escudo } = await cambiarEscudo(
      { bytes: pngValido() },
      actor("ADMIN_MUNICIPAL"),
    );

    expect(await marcaDe()).toEqual({
      primario: GUINDA,
      primarioTexto: "#ffffff",
      secundario: ORO,
      escudo,
    });
  });

  it("un color que no se puede medir se rechaza sin escribir nada", async () => {
    await escribirMarca({ escudo: ESCUDO_PREVIO });

    const motivo = await motivoDe(() =>
      cambiarColores(
        { primario: "oklch(0.5)", secundario: ORO },
        actor("ADMIN_MUNICIPAL"),
      ),
    );

    expect(motivo.codigo).toBe("VALIDACION");
    expect(await marcaDe()).toEqual({ escudo: ESCUDO_PREVIO });
  });

  it("un secundario con formato invalido se rechaza sin escribir nada", async () => {
    const motivo = await motivoDe(() =>
      cambiarColores(
        { primario: GUINDA, secundario: "red;background:url(//x)" },
        actor("ADMIN_MUNICIPAL"),
      ),
    );

    expect(motivo.codigo).toBe("VALIDACION");
    expect(await marcaDe()).toEqual({});
  });
});

describe("restablecerColores", () => {
  it("borra los tres colores y conserva el escudo", async () => {
    await escribirMarca({
      primario: GUINDA,
      primarioTexto: "#ffffff",
      secundario: ORO,
      escudo: ESCUDO_PREVIO,
    });

    await restablecerColores(actor("ADMIN_MUNICIPAL"));

    expect(await marcaDe()).toEqual({ escudo: ESCUDO_PREVIO });
  });

  it("sin escudo deja la marca vacia en vez de con claves en null", async () => {
    await escribirMarca({
      primario: GUINDA,
      primarioTexto: "#ffffff",
      secundario: ORO,
    });

    await restablecerColores(actor("ADMIN_MUNICIPAL"));

    expect(await marcaDe()).toEqual({});
  });
});
