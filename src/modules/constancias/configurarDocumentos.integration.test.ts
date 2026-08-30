import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearConfigurarDocumentos } from "./application/configurarDocumentos";
import { crearDocumentosDelAyuntamiento } from "./application/documentosDelAyuntamiento";
import { configuracionDeDocumentos } from "./infrastructure/esquema";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * El caso de uso completo contra Postgres real: `withTenant`, RLS y el
 * upsert de `configuracion_de_documentos` no se pueden simular con un mock
 * (mismo criterio que `cambiarEscudo.integration.test.ts`).
 */

let gente: GentePorMunicipio;

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await withTenant(motul, (tx) =>
    tx
      .insert(configuracionDeDocumentos)
      .values({ ayuntamientoId: motul, datos: {} })
      .onConflictDoUpdate({
        target: configuracionDeDocumentos.ayuntamientoId,
        set: { datos: {} },
      }),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("configurarDocumentos + documentosDelAyuntamiento", () => {
  it("lo escrito se lee exactamente igual", async () => {
    const configurarDocumentos = crearConfigurarDocumentos(
      repositorioDeDocumentosSql,
    );
    const documentosDelAyuntamiento = crearDocumentosDelAyuntamiento(
      repositorioDeDocumentosSql,
    );
    const contexto = actor("ADMIN_MUNICIPAL");

    await configurarDocumentos(
      {
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
        leyendaDePie: "Documento sin validez fiscal.",
      },
      contexto,
    );

    expect(await documentosDelAyuntamiento(contexto)).toEqual({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
      leyendaDePie: "Documento sin validez fiscal.",
    });
  });

  it("escribir dos veces conserva las claves no tocadas por la segunda escritura", async () => {
    const configurarDocumentos = crearConfigurarDocumentos(
      repositorioDeDocumentosSql,
    );
    const documentosDelAyuntamiento = crearDocumentosDelAyuntamiento(
      repositorioDeDocumentosSql,
    );
    const contexto = actor("ADMIN_MUNICIPAL");

    await configurarDocumentos(
      { firmanteNombre: "Juan Poot", firmanteCargo: "Secretario Municipal" },
      contexto,
    );
    await configurarDocumentos(
      { leyendaDePie: "Documento sin validez fiscal." },
      contexto,
    );

    expect(await documentosDelAyuntamiento(contexto)).toEqual({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
      leyendaDePie: "Documento sin validez fiscal.",
    });
  });

  it("un campo opcional compuesto con undefined se borra, no sobrevive del merge anterior", async () => {
    // El bug que esto prueba: la Server Action tiene que enviar `undefined`
    // -no omitir la clave- para que una leyenda ya configurada se pueda
    // vaciar (hallazgo de GGA en la revision de esta rebanada,
    // `configurarDocumentosAction.ts`).
    const configurarDocumentos = crearConfigurarDocumentos(
      repositorioDeDocumentosSql,
    );
    const documentosDelAyuntamiento = crearDocumentosDelAyuntamiento(
      repositorioDeDocumentosSql,
    );
    const contexto = actor("ADMIN_MUNICIPAL");

    await configurarDocumentos(
      {
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
        leyendaDePie: "Documento sin validez fiscal.",
      },
      contexto,
    );
    await configurarDocumentos(
      {
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
        leyendaDePie: undefined,
      },
      contexto,
    );

    expect(await documentosDelAyuntamiento(contexto)).toEqual({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
    });
  });

  it("un rol distinto de ADMIN_MUNICIPAL no puede configurar", async () => {
    const configurarDocumentos = crearConfigurarDocumentos(
      repositorioDeDocumentosSql,
    );

    const motivo = await motivoDe(() =>
      configurarDocumentos(
        { firmanteNombre: "Juan Poot", firmanteCargo: "Secretario Municipal" },
        actor("OPERADOR"),
      ),
    );

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
  });
});
