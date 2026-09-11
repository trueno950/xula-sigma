import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { repositorioDeIntervencionesSql } from "./infrastructure";
import {
  intervenciones,
  revisionesDeIntervenciones,
} from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertar = async (lugarId: string) => {
  const [fila] = await withTenant(motul, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId: motul,
          lugarId,
          registradoPorUsuarioId: gente.motul.OPERADOR,
        }),
      )
      .returning({ id: intervenciones.id }),
  );

  if (!fila) throw new Error("No se pudo sembrar la intervencion de prueba.");

  return fila.id;
};

describe("concurrencia de revisiones de intervenciones", () => {
  it("captura los valores posteriores a una correccion concurrente", async () => {
    const lugarMotul = await lugarDe("Comisaria Motul Carrera Revision");
    const id = await insertar(lugarMotul);
    let liberar: () => void = () => {};
    let confirmar: () => void = () => {};
    let rechazar: (error: unknown) => void = () => {};
    const lista = new Promise<void>((resolve, reject) => {
      confirmar = resolve;
      rechazar = reject;
    });
    const abierta = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const paralela = enTransaccionParalela(motul, async (tx) => {
      await tx`SELECT id FROM intervenciones WHERE id = ${id} FOR UPDATE`;
      await tx`
        UPDATE intervenciones
           SET tipo = 'MEJORA',
               descripcion = ${"Descripcion concurrente confirmada"}
         WHERE id = ${id}
      `;
      confirmar();
      await abierta;
    });
    void paralela.catch(rechazar);

    try {
      await lista;
      const correccion = withTenant(motul, (tx) =>
        repositorioDeIntervencionesSql.corregir(tx, {
          id,
          ayuntamientoId: motul,
          usuarioId: gente.motul.ADMIN_MUNICIPAL,
          cambios: {
            tipo: "FUGA",
            fechaDeOcurrencia: "2026-02-20",
            lugarId: lugarMotul,
            calleId: null,
            reporteId: null,
            descripcion: "Descripcion final corregida",
          },
        }),
      );
      const pendiente = Symbol("pendiente");
      expect(
        await Promise.race([
          correccion.then(
            () => "resuelta" as const,
            () => "rechazada" as const,
          ),
          new Promise<typeof pendiente>((resolve) =>
            setTimeout(() => resolve(pendiente), 300),
          ),
        ]),
      ).toBe(pendiente);

      liberar();
      await paralela;
      await correccion;
    } finally {
      liberar();
      await paralela;
    }

    const [revision] = await withTenant(motul, (tx) =>
      tx.select().from(revisionesDeIntervenciones),
    );
    expect(revision?.valoresAnteriores).toEqual({
      tipo: "MEJORA",
      estado: "PLANIFICADA",
      fechaDeOcurrencia: "2026-01-15",
      lugarId: lugarMotul,
      calleId: null,
      reporteId: null,
      descripcion: "Descripcion concurrente confirmada",
    });
  });
});
