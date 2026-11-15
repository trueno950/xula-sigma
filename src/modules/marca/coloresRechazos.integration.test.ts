import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearCambiarColores } from "./application/cambiarColores";
import { crearRestablecerColores } from "./application/restablecerColores";
import { escribirMarca, marcaDe } from "./escudoDePrueba";
import { repositorioDeMarcaSql } from "./infrastructure/repositorioDeMarcaSql";

/**
 * Lo que S6 no deja pasar: ningun rol sin `puedeCambiarMarca` escribe
 * colores ni restablece la marca. Separado del camino de escritura por las
 * 200 lineas por archivo de `AGENTS.md`, igual que
 * `cambiarEscudoRechazos.integration.test.ts`.
 */

const GUINDA = "oklch(0.42 0.12 25)";
const ORO = "#ffd700";
const MARCA_PREVIA = {
  primario: GUINDA,
  primarioTexto: "#ffffff",
  secundario: ORO,
};

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
  await escribirMarca(MARCA_PREVIA);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("colores: rechazos", () => {
  it("un OPERADOR no puede guardar colores y la marca queda igual", async () => {
    const motivo = await motivoDe(() =>
      cambiarColores({ primario: ORO, secundario: ORO }, actor("OPERADOR")),
    );

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
    expect(await marcaDe()).toEqual(MARCA_PREVIA);
  });

  it("un OPERADOR tampoco puede restablecer los colores", async () => {
    const motivo = await motivoDe(() => restablecerColores(actor("OPERADOR")));

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
    expect(await marcaDe()).toEqual(MARCA_PREVIA);
  });

  it("el SUPER_ADMIN no puede cambiar la marca de un municipio", async () => {
    // `roles.test.ts` prueba la regla suelta; esto prueba que los dos casos
    // de uso la aplican antes de abrir la transaccion.
    const alGuardar = await motivoDe(() =>
      cambiarColores({ primario: ORO, secundario: ORO }, actor("SUPER_ADMIN")),
    );
    const alRestablecer = await motivoDe(() =>
      restablecerColores(actor("SUPER_ADMIN")),
    );

    expect(alGuardar.codigo).toBe("NO_AUTORIZADO");
    expect(alRestablecer.codigo).toBe("NO_AUTORIZADO");
    expect(await marcaDe()).toEqual(MARCA_PREVIA);
  });

  it("el rol CONSULTA no escribe nada", async () => {
    const motivo = await motivoDe(() =>
      cambiarColores({ primario: ORO, secundario: ORO }, actor("CONSULTA")),
    );

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
    expect(await marcaDe()).toEqual(MARCA_PREVIA);
  });
});
