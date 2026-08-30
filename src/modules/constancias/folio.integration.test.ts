import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { anioEnMerida } from "@/shared/lib/fecha";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import type { RepositorioDeConstancias } from "./application/puertos";
import { crearValidarFolio } from "./application/validarFolio";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { foliosDeDocumentos } from "./infrastructure/esquema";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * `constancias/folio.integration.test.ts`: la prueba mas critica del
 * cambio (design.md de `constancias-oficios`, seccion 4). El contador se
 * declara "no medido" hasta que este archivo corre contra Postgres real.
 */

let gente: GentePorMunicipio;

const actor = (
  municipio: keyof GentePorMunicipio,
  rol: Parameters<typeof contextoDe>[2],
) => contextoDe(gente, municipio, rol);

const emitirConstancia = crearEmitirConstancia(
  repositorioDeConstanciasSql,
  contadorDeFoliosSql,
  repositorioDeDocumentosSql,
  crearLectorDeTitularesPorPadron,
  crearLectorDeDireccionesPorTerritorio,
);

const validarFolio = crearValidarFolio(repositorioDeConstanciasSql);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  // Aisla la serie del contador y las constancias emitidas entre `it`:
  // cada escenario asume que arranca de tablas vacias, y `limpiar()` solo
  // corre en `afterAll`. `personas`, `domicilios` y `residencias` no
  // necesitan el mismo reinicio: cada `it` crea su propio titular con un
  // nombre nuevo, asi que no colisionan entre si.
  await owner`TRUNCATE folios_de_documentos, constancias, reimpresiones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("el contador de folios bajo lock", () => {
  it("T6: dos emisiones que se cruzan de verdad, con una segunda conexion independiente, quedan consecutivas y sin hueco", async () => {
    const anio = anioEnMerida();
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const { personaId } = await titularConResidenciaVigente(
      "Concurrente",
      admin,
    );
    await configurarFirmaDePrueba(admin);

    let liberarParalela: () => void = () => {};
    const puedeConfirmar = new Promise<void>((resolve) => {
      liberarParalela = resolve;
    });

    // La transaccion paralela toma el folio con la misma sentencia exacta
    // de design.md seccion 4, escrita en SQL crudo -no Drizzle- porque
    // `enTransaccionParalela` corre sobre `postgres()` puro, ajeno al pool
    // de Drizzle que usa `withTenant`.
    let consecutivoTomado = -1;
    const paralela = enTransaccionParalela(motul, async (tx) => {
      const [fila] = await tx<{ ultimo_consecutivo: number }[]>`
        INSERT INTO folios_de_documentos
               (ayuntamiento_id, tipo, anio, ultimo_consecutivo)
        VALUES (${motul}, 'VECINDAD', ${anio}, 1)
        ON CONFLICT (ayuntamiento_id, tipo, anio) DO UPDATE
           SET ultimo_consecutivo = folios_de_documentos.ultimo_consecutivo + 1
        RETURNING ultimo_consecutivo
      `;
      consecutivoTomado = fila!.ultimo_consecutivo;

      // Se queda abierta -sin COMMIT- hasta que el test decida soltarla.
      await puedeConfirmar;
    });

    // Le da tiempo a la paralela de terminar su INSERT y tomar el lock
    // antes de disparar la emision real.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(consecutivoTomado).toBe(1);

    const operador = actor("motul", "OPERADOR");
    const emision = emitirConstancia(personaId, operador);

    const PENDIENTE = Symbol("pendiente");
    const resultadoDeLaCarrera = await Promise.race([
      emision.then(() => "resuelto" as const),
      new Promise((resolve) => setTimeout(() => resolve(PENDIENTE), 300)),
    ]);

    // Lo que este test existe para probar: sin una segunda conexion real,
    // `emitirConstancia` resolveria antes de que la paralela suelte el
    // lock -y esta linea fallaria en silencio-.
    expect(resultadoDeLaCarrera).toBe(PENDIENTE);

    liberarParalela();
    await paralela;

    const id = await emision;

    const guardada = await withTenant(motul, (tx) =>
      repositorioDeConstanciasSql.buscarPorId(tx, id),
    );
    expect(guardada?.consecutivo).toBe(consecutivoTomado + 1);
    expect(guardada?.folio).toBe(`VEC-${anio}-000002`);
  });

  it("T7: una emision que revierte despues de tomar folio no lo consume", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const { personaId: personaUno } = await titularConResidenciaVigente(
      "Falla",
      admin,
    );
    const { personaId: personaDos } = await titularConResidenciaVigente(
      "Reintento",
      admin,
    );
    await configurarFirmaDePrueba(admin);

    const repositorioQueFalla: RepositorioDeConstancias = {
      ...repositorioDeConstanciasSql,
      guardar: async () => {
        throw new Error("fallo simulado, despues de tomar folio");
      },
    };
    const emitirConstanciaQueFalla = crearEmitirConstancia(
      repositorioQueFalla,
      contadorDeFoliosSql,
      repositorioDeDocumentosSql,
      crearLectorDeTitularesPorPadron,
      crearLectorDeDireccionesPorTerritorio,
    );

    await expect(
      emitirConstanciaQueFalla(personaUno, actor("motul", "OPERADOR")),
    ).rejects.toThrow("fallo simulado");

    const id = await emitirConstancia(personaDos, actor("motul", "OPERADOR"));
    const guardada = await withTenant(motul, (tx) =>
      repositorioDeConstanciasSql.buscarPorId(tx, id),
    );

    // El rollback se llevo el incremento entero: la emision exitosa toma
    // el mismo numero que hubiera tomado la que fallo.
    expect(guardada?.consecutivo).toBe(1);
  });

  it("Motul y Ticul emiten su primera constancia del anio sin colisionar", async () => {
    const anio = anioEnMerida();
    const adminMotul = actor("motul", "ADMIN_MUNICIPAL");
    const adminTicul = actor("ticul", "ADMIN_MUNICIPAL");

    const { personaId: personaMotul } = await titularConResidenciaVigente(
      "DeMotul",
      adminMotul,
    );
    const { personaId: personaTicul } = await titularConResidenciaVigente(
      "DeTicul",
      adminTicul,
    );
    await configurarFirmaDePrueba(adminMotul);
    await configurarFirmaDePrueba(adminTicul);

    const idMotul = await emitirConstancia(personaMotul, adminMotul);
    const idTicul = await emitirConstancia(personaTicul, adminTicul);

    const guardadaMotul = await withTenant(motul, (tx) =>
      repositorioDeConstanciasSql.buscarPorId(tx, idMotul),
    );
    const guardadaTicul = await withTenant(ticul, (tx) =>
      repositorioDeConstanciasSql.buscarPorId(tx, idTicul),
    );

    expect(guardadaMotul?.folio).toBe(`VEC-${anio}-000001`);
    expect(guardadaTicul?.folio).toBe(`VEC-${anio}-000001`);
  });

  it("una serie sembrada del anio anterior no corre hacia el anio actual", async () => {
    const anio = anioEnMerida();
    const admin = actor("motul", "ADMIN_MUNICIPAL");

    await withTenant(motul, (tx) =>
      tx.insert(foliosDeDocumentos).values({
        ayuntamientoId: motul,
        tipo: "VECINDAD",
        anio: anio - 1,
        ultimoConsecutivo: 42,
      }),
    );

    const { personaId } = await titularConResidenciaVigente("AnioNuevo", admin);
    await configurarFirmaDePrueba(admin);

    const id = await emitirConstancia(personaId, admin);
    const guardada = await withTenant(motul, (tx) =>
      repositorioDeConstanciasSql.buscarPorId(tx, id),
    );

    expect(guardada?.consecutivo).toBe(1);
    expect(guardada?.folio).toBe(`VEC-${anio}-000001`);
  });
});

describe("validarFolio: RLS, no el codigo, es lo que aisla entre municipios", () => {
  it("un folio de otro municipio no confirma su existencia, ni con el codigo de este", async () => {
    /**
     * Motul y Ticul emiten su primera constancia del anio: el mismo texto
     * de folio para los dos, porque cada uno arranca su propia serie en 1
     * (design.md de `constancias-oficios`, seccion 6, spec "Folio de otro
     * municipio no confirma su existencia"). `validarFolio` desde el
     * subdominio de Motul solo puede resolver la fila de Motul -RLS la
     * acota dentro de `withTenant`- y nunca la de Ticul, aunque el texto del
     * folio coincida caracter por caracter.
     */
    const adminMotul = actor("motul", "ADMIN_MUNICIPAL");
    const adminTicul = actor("ticul", "ADMIN_MUNICIPAL");

    const { personaId: personaMotul } = await titularConResidenciaVigente(
      "ValidaMotul",
      adminMotul,
    );
    const { personaId: personaTicul } = await titularConResidenciaVigente(
      "ValidaTicul",
      adminTicul,
    );
    await configurarFirmaDePrueba(adminMotul);
    await configurarFirmaDePrueba(adminTicul);

    const idMotul = await emitirConstancia(personaMotul, adminMotul);
    const idTicul = await emitirConstancia(personaTicul, adminTicul);

    const guardadaMotul = await withTenant(motul, (tx) =>
      repositorioDeConstanciasSql.buscarPorId(tx, idMotul),
    );
    const guardadaTicul = await withTenant(ticul, (tx) =>
      repositorioDeConstanciasSql.buscarPorId(tx, idTicul),
    );
    expect(guardadaMotul?.folio).toBe(guardadaTicul?.folio);

    const folio = guardadaMotul?.folio as string;

    // El codigo de Ticul, probado desde el subdominio de Motul contra el
    // mismo texto de folio: NO_VALIDO. Si RLS no acotara, esto validaria
    // -confirmando que el folio existe en Ticul, que es justo lo que la
    // union cerrada de `proyectarValidacion` existe para no revelar.
    const conCodigoDeTicul = await validarFolio({
      ayuntamientoId: motul,
      folio,
      codigo: guardadaTicul?.codigoVerificacion as string,
    });
    expect(conCodigoDeTicul.estado).toBe("NO_VALIDO");

    // El propio codigo de Motul, mismo folio, mismo subdominio: valido.
    const conCodigoDeMotul = await validarFolio({
      ayuntamientoId: motul,
      folio,
      codigo: guardadaMotul?.codigoVerificacion as string,
    });
    expect(conCodigoDeMotul.estado).toBe("VIGENTE");
  });
});
