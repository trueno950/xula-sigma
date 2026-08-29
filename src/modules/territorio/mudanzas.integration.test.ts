import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearRegistrarMudanza } from "./application/registrarMudanza";
import { comoDomicilioId } from "./domain";
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

const personaDePrueba = (nombres: string) =>
  altaDePersona(
    { nombres, primerApellido: "Poot", segundoApellido: null, curp: null },
    contextoDe(),
  );

const domicilioDePrueba = async (nombreCalle: string) => {
  const lugar = await crearLugar("colonia", `Colonia de ${nombreCalle}`);
  return crearDomicilio(lugar, nombreCalle);
};

const residenciasDe = (personaId: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(residencias).where(eq(residencias.personaId, personaId)),
  );

describe("registrarMudanza", () => {
  it("primera mudanza de una persona: abre sin cerrar nada", async () => {
    const { id: personaId } = await personaDePrueba("Juan");
    const domicilioId = await domicilioDePrueba("Calle Primera");

    await registrarMudanza(personaId, domicilioId, contextoDe());

    const filas = await residenciasDe(personaId);
    expect(filas).toHaveLength(1);
    expect(filas[0]?.hastaEn).toBeNull();
    expect(filas[0]?.domicilioId).toBe(domicilioId);
  });

  it("segunda mudanza: cierra la residencia anterior y abre la nueva en la misma transaccion", async () => {
    const { id: personaId } = await personaDePrueba("Maria");
    const domicilioUno = await domicilioDePrueba("Calle Vieja");
    const domicilioDos = await domicilioDePrueba("Calle Nueva");

    await registrarMudanza(personaId, domicilioUno, contextoDe());
    await registrarMudanza(personaId, domicilioDos, contextoDe());

    const filas = await residenciasDe(personaId);
    expect(filas).toHaveLength(2);

    const cerrada = filas.find((f) => f.domicilioId === domicilioUno);
    const abierta = filas.find((f) => f.domicilioId === domicilioDos);
    expect(cerrada?.hastaEn).not.toBeNull();
    expect(abierta?.hastaEn).toBeNull();
  });

  it("un domicilioId de otro tenant o inexistente rechaza sin cerrar la residencia previa", async () => {
    const { id: personaId } = await personaDePrueba("Rosa");
    const domicilioUno = await domicilioDePrueba("Calle Rosa");
    await registrarMudanza(personaId, domicilioUno, contextoDe());

    const domicilioInexistente = comoDomicilioId(
      "00000000-0000-4000-8000-000000000000",
    );
    await expect(
      registrarMudanza(personaId, domicilioInexistente, contextoDe()),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    const filas = await residenciasDe(personaId);
    expect(filas).toHaveLength(1);
    expect(filas[0]?.hastaEn).toBeNull();
  });

  /**
   * `DB_POOL_MAX=1` en integracion (design.md seccion 6, `vitest.config.ts:64`)
   * serializa cualquier par de `withTenant` disparados desde el test aunque
   * se llamen con `Promise.allSettled`: no hay dos conexiones para que las
   * dos transacciones se crucen de verdad, asi que dos `registrarMudanza`
   * "concurrentes" a nivel de aplicacion terminan siendo dos mudanzas
   * secuenciales -la segunda cierra lo que abrio la primera-, ya cubierto
   * por el test anterior. La concurrencia real la resuelve el indice
   * parcial, no la aplicacion (design.md seccion 8, "El indice parcial es
   * el mecanismo de concurrencia"): se prueba directo contra Postgres, con
   * el mismo patron que `lugares_una_cabecera`
   * (`lugares.isolation.test.ts:82`).
   */
  it("un segundo INSERT con hastaEn null para la misma persona es rechazado por residencias_una_abierta_idx", async () => {
    const { id: personaId } = await personaDePrueba("Carmen");
    const domicilioA = await domicilioDePrueba("Calle A concurrente");
    const domicilioB = await domicilioDePrueba("Calle B concurrente");

    await withTenant(motul, (tx) =>
      tx.insert(residencias).values({
        ayuntamientoId: motul,
        personaId,
        domicilioId: domicilioA,
        desdeEn: "2024-01-01",
      }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(residencias).values({
          ayuntamientoId: motul,
          personaId,
          domicilioId: domicilioB,
          desdeEn: "2024-01-02",
        }),
      ),
    );

    expect(motivo).toMatch(/residencias_una_abierta_idx/i);

    const filas = await residenciasDe(personaId);
    expect(filas).toHaveLength(1);
  });
});
