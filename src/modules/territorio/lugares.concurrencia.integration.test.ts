import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeCalle } from "./application/altaDeCalle";
import { crearDarDeBajaLugar } from "./application/darDeBajaLugar";
import {
  type CambioDeLugar,
  esperarOperacionBloqueada,
} from "./carrerasDeCalleDePrueba";
import { LugarConDependientesError, type LugarId } from "./domain";
import { calles, lugares } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

/**
 * Abre otra transaccion que bloquea el lugar, aplica `cambio` y se queda
 * abierta hasta `liberar`: es la otra mitad de la carrera, la que llego
 * primero.
 */
const correrContra = async (
  id: LugarId,
  cambio: CambioDeLugar,
  operacion: () => Promise<unknown>,
): Promise<unknown> => {
  let liberar: () => void = () => {};
  let confirmar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await tx`SELECT id FROM lugares WHERE id = ${id} FOR UPDATE`;
    await cambio(tx, id);
    confirmar();
    await abierta;
  });

  await lista;
  const pendiente = operacion().catch((error: unknown) => error);
  await esperarOperacionBloqueada(pendiente);
  liberar();
  await transaccion;
  return pendiente;
};

describe("altas y bajas de lugares bajo concurrencia", () => {
  it("un alta de calle espera a la baja concurrente del asentamiento y no cuelga de un lugar dado de baja", async () => {
    const comisaria = await crearLugar("comisaria", "Carrera de baja");
    const altaDeCalle = crearAltaDeCalle(
      repositorioDeCallesSql,
      repositorioDeLugaresSql,
    );

    const resultado = await correrContra(
      comisaria,
      async (tx, id) => {
        await tx`UPDATE lugares SET baja_en = now() WHERE id = ${id}`;
      },
      () =>
        altaDeCalle(
          { nombre: "Calle tardia", lugarId: comisaria },
          contextoDe(),
        ),
    );

    expect(resultado).toBeInstanceOf(NoEncontradoError);
    const colgadas = await withTenant(motul, (tx) =>
      tx.select().from(calles).where(eq(calles.lugarId, comisaria)),
    );
    expect(colgadas).toHaveLength(0);
  });

  it("una baja espera a un domicilio concurrente y lo cuenta", async () => {
    const comisaria = await crearLugar("comisaria", "Carrera de domicilio");
    const calleId = await crearCalle(comisaria, "Calle de la carrera");
    const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);

    const resultado = await correrContra(
      comisaria,
      async (tx, id) => {
        await tx`
          INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id)
          VALUES (${motul}, ${id}, ${calleId})
        `;
      },
      () => darDeBajaLugar(comisaria, contextoDe()),
    );

    expect(resultado).toBeInstanceOf(LugarConDependientesError);
    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ bajaEn: lugares.bajaEn })
        .from(lugares)
        .where(eq(lugares.id, comisaria)),
    );
    expect(fila?.bajaEn).toBeNull();
  });
});
