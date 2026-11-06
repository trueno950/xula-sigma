import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearRegistrarMudanza } from "./application/registrarMudanza";
import { esperarOperacionBloqueada } from "./carrerasDeCalleDePrueba";
import { type DomicilioId, MudanzaConcurrenteError } from "./domain";
import { residencias } from "./infrastructure/esquema";
import { crearLectorDePersonasPorPadron } from "./infrastructure/lectorDePersonasPorPadron";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeResidenciasSql } from "./infrastructure/repositorioDeResidenciasSql";
import { contextoDe, crearDomicilio, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registrarMudanza = crearRegistrarMudanza(
  repositorioDeResidenciasSql,
  repositorioDeDomiciliosSql,
  crearLectorDePersonasPorPadron,
);

const personaDePrueba = async (nombres: string) => {
  const { id } = await altaDePersona(
    { nombres, primerApellido: "Can", segundoApellido: null, curp: null },
    contextoDe(),
  );
  return id;
};

const domicilioDePrueba = async (nombreCalle: string) => {
  const comisaria = await crearLugar("comisaria", `Comisaria ${nombreCalle}`);
  const colonia = await crearLugar(
    "colonia",
    `Colonia ${nombreCalle}`,
    comisaria,
  );
  return crearDomicilio(colonia, nombreCalle);
};

/**
 * La otra mudanza, en su propia conexion: cierra la residencia abierta y
 * abre otra, y no confirma hasta `liberar`. Es lo que `registrarMudanza`
 * escribe, en SQL, porque el pool de `withTenant` tiene una sola conexion
 * en integracion y dos llamadas por ese pool nunca se cruzan.
 */
const iniciarOtraMudanza = (personaId: string, domicilioId: DomicilioId) => {
  let confirmar: () => void = () => {};
  let liberar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await tx`UPDATE residencias SET hasta_en = current_date
      WHERE persona_id = ${personaId} AND hasta_en IS NULL`;
    await tx`INSERT INTO residencias (ayuntamiento_id, persona_id, domicilio_id, desde_en)
      VALUES (${motul}, ${personaId}, ${domicilioId}, current_date)`;
    confirmar();
    await abierta;
  });

  return { lista, transaccion, liberar };
};

const abiertasDe = (personaId: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({ domicilioId: residencias.domicilioId })
      .from(residencias)
      .where(
        and(eq(residencias.personaId, personaId), isNull(residencias.hastaEn)),
      ),
  );

describe("dos mudanzas simultaneas de la misma persona", () => {
  it.each([
    ["sin residencia previa", false],
    ["con una residencia previa abierta", true],
  ])(
    "%s: la que llega segunda recibe MudanzaConcurrenteError y queda una sola abierta",
    async (caso, conPrevia) => {
      const personaId = await personaDePrueba(`Carrera ${caso}`);
      const casaDeLaOtra = await domicilioDePrueba(`Calle otra ${caso}`);
      const casaPropia = await domicilioDePrueba(`Calle propia ${caso}`);
      if (conPrevia) {
        const previa = await domicilioDePrueba(`Calle previa ${caso}`);
        await registrarMudanza(personaId, previa, contextoDe());
      }
      const otra = iniciarOtraMudanza(personaId, casaDeLaOtra);
      await otra.lista;

      const mudanza = registrarMudanza(personaId, casaPropia, contextoDe());
      await esperarOperacionBloqueada(mudanza);
      otra.liberar();
      await otra.transaccion;

      await expect(mudanza).rejects.toBeInstanceOf(MudanzaConcurrenteError);
      await expect(abiertasDe(personaId)).resolves.toEqual([
        { domicilioId: casaDeLaOtra },
      ]);
    },
  );
});
