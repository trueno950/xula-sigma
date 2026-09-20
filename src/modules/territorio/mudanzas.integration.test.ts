import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  enTransaccionParalela,
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

  /**
   * `residencias_domicilio_tenant_fk` ya hace esperar el INSERT de la
   * mudanza mientras la baja tiene el domicilio bloqueado -eso no es lo que
   * este test prueba-. Lo que prueba es que, una vez liberado el lock, la
   * mudanza no siga adelante con una decision tomada antes del bloqueo: si
   * lee el domicilio sin `FOR UPDATE`, ya decidio "esta activo" con datos
   * viejos y inserta la residencia igual, aunque la baja haya ganado la
   * carrera.
   */
  it("una mudanza no crea una residencia si el domicilio se da de baja mientras espera", async () => {
    const { id: personaId } = await personaDePrueba("Carrera");
    const domicilioId = await domicilioDePrueba("Calle Carrera");

    let empezarBaja: () => void = () => {};
    const puedeEmpezarBaja = new Promise<void>((resolve) => {
      empezarBaja = resolve;
    });

    // Misma conexion real y propia que el test de folios: el pool de
    // `withTenant` tiene una sola conexion en integracion (design.md
    // seccion 6), y dos llamadas por ese pool nunca se cruzan de verdad.
    const bajaParalela = enTransaccionParalela(motul, async (tx) => {
      await tx`SELECT id FROM domicilios WHERE id = ${domicilioId} FOR UPDATE`;
      await puedeEmpezarBaja;
      await tx`UPDATE domicilios SET baja_en = now() WHERE id = ${domicilioId}`;
    });

    // Le da tiempo a la paralela de tomar el lock antes de la mudanza real.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mudanza = registrarMudanza(personaId, domicilioId, contextoDe());

    // Le da tiempo a la mudanza de leer el domicilio y quedar esperando en
    // el INSERT -o en su propio lock, si ya esta arreglado- antes de que la
    // baja gane la carrera.
    await new Promise((resolve) => setTimeout(resolve, 100));
    empezarBaja();
    await bajaParalela;

    await expect(mudanza).rejects.toBeInstanceOf(NoEncontradoError);

    const filas = await residenciasDe(personaId);
    expect(filas).toHaveLength(0);
  });
});
