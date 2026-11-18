import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona, fusionarPersonas } from "@/modules/padron";
import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
  registrarMudanza,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { domiciliosVigentesDe } from "./domiciliosVigentes";

/**
 * Contra Postgres real: el domicilio vigente del listado (S1) sale de dos
 * lecturas en lote -identidades de `padron` y direcciones de `territorio`-
 * y de ninguna escritura de residencias en la fusion. Que la persona de otro
 * municipio no resuelva no se puede afirmar con mocks: lo decide RLS.
 */

const contextoEn = (ayuntamientoId: typeof motul): ContextoActual => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

const contexto = contextoEn(motul);

const personaDePrueba = async (nombres: string, ctx: ContextoActual) =>
  (
    await altaDePersona(
      { nombres, primerApellido: "Poot", segundoApellido: null, curp: null },
      ctx,
    )
  ).id;

const domicilioDePrueba = async ({
  ctx,
  nombreDeLugar,
  nombreDeCalle,
  numero,
}: {
  ctx: ContextoActual;
  nombreDeLugar: string;
  nombreDeCalle: string;
  numero: string;
}) => {
  const lugar = await altaDeLugar(
    { tipo: "comisaria", nombre: nombreDeLugar, padreId: null },
    ctx,
  );
  const calle = await altaDeCalle(
    { nombre: nombreDeCalle, lugarId: lugar.id },
    ctx,
  );

  return altaDeDomicilio(
    {
      lugarId: lugar.id,
      calleId: calle.id,
      numero,
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    ctx,
  );
};

/** Persona con residencia abierta en un domicilio nuevo de su municipio. */
const personaMudadaA = async ({
  nombres,
  nombreDeLugar,
  nombreDeCalle,
  numero,
  ctx = contexto,
}: {
  nombres: string;
  nombreDeLugar: string;
  nombreDeCalle: string;
  numero: string;
  ctx?: ContextoActual;
}) => {
  const domicilio = await domicilioDePrueba({
    ctx,
    nombreDeLugar,
    nombreDeCalle,
    numero,
  });
  const personaId = await personaDePrueba(nombres, ctx);
  await registrarMudanza(personaId, domicilio.id, ctx);

  return personaId;
};

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("domiciliosVigentesDe", () => {
  it("etiqueta la residencia abierta de cada persona de la pagina", async () => {
    const personaId = await personaMudadaA({
      nombres: "Aurelia",
      nombreDeLugar: "Comisaria Listado",
      nombreDeCalle: "Calle 20",
      numero: "42",
    });

    const domicilios = await domiciliosVigentesDe([personaId], contexto);

    expect(domicilios.get(personaId)).toBe("Calle 20 #42, Comisaria Listado");
  });

  it("quien no tiene residencia vigente no aparece, para que la pantalla diga «Sin domicilio»", async () => {
    const sinDomicilio = await personaDePrueba("Berenice", contexto);

    const domicilios = await domiciliosVigentesDe([sinDomicilio], contexto);

    expect(domicilios.has(sinDomicilio)).toBe(false);
  });

  it("la ganadora de una fusion toma el domicilio que su perdedora todavia conserva", async () => {
    const perdedora = await personaMudadaA({
      nombres: "Casilda",
      nombreDeLugar: "Comisaria Fusion",
      nombreDeCalle: "Calle 8",
      numero: "1",
    });
    const ganadora = await personaDePrueba("Casilda Maria", contexto);
    await fusionarPersonas(perdedora, ganadora, contexto);

    const domicilios = await domiciliosVigentesDe([ganadora], contexto);

    expect(domicilios.get(ganadora)).toBe("Calle 8 #1, Comisaria Fusion");
  });

  it("el id de una persona de otro municipio no resuelve ninguna identidad", async () => {
    const contextoDeTicul = contextoEn(ticul);
    const ajena = await personaMudadaA({
      nombres: "Dorotea",
      nombreDeLugar: "Comisaria Ajena",
      nombreDeCalle: "Calle Ajena",
      numero: "7",
      ctx: contextoDeTicul,
    });

    const domicilios = await domiciliosVigentesDe([ajena], contexto);

    expect(domicilios.size).toBe(0);
  });
});
