import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { buscadorDeDireccionesPorTerritorio } from "./infrastructure/buscadorDeDireccionesPorTerritorio";

/**
 * El buscador de direcciones del alta de reporte comparte la consulta del
 * `?q=` de Domicilios de Territorio: tambien ignora mayusculas y acentos
 * (decision del usuario en `odd/tasks/territorio-pendientes.md`, L3).
 */
let gente: GentePorMunicipio;
let domicilioId: string;

const actor = (municipio: "motul" | "ticul") =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  const contexto = actor("motul");
  const { id: lugarId } = await altaDeLugar(
    { tipo: "comisaria", nombre: "Ucí Acentos", padreId: null },
    contexto,
  );
  const { id: calleId } = await altaDeCalle(
    { nombre: "Calle José Pérez", lugarId },
    contexto,
  );
  ({ id: domicilioId } = await altaDeDomicilio(
    {
      lugarId,
      calleId,
      numero: "7",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contexto,
  ));
});

afterAll(async () => {
  await owner.end();
  await cerrarConexion();
});

const idsDe = async (municipio: "motul" | "ticul", consulta: string) => {
  const resultado = await buscadorDeDireccionesPorTerritorio.buscar(
    actor(municipio),
    consulta,
    50,
  );
  return resultado.domicilios.map((domicilio) => domicilio.id);
};

describe("el buscador de direcciones de reportes", () => {
  it("«jose perez» encuentra la calle «José Pérez»", async () => {
    expect(await idsDe("motul", "jose perez")).toContain(domicilioId);
  });

  it("«JOSÉ» en mayusculas tambien la encuentra", async () => {
    expect(await idsDe("motul", "JOSÉ")).toContain(domicilioId);
  });

  it("desde otro municipio no aparece", async () => {
    expect(await idsDe("ticul", "jose perez")).not.toContain(domicilioId);
  });
});
