import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeCalle, altaDeLugar, type LugarId } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { registrarIntervencion } from "../composicion";
import { CalleFueraDelLugarError } from "../domain";
import {
  intervenciones,
  revisionesDeIntervenciones,
} from "../infrastructure/esquema";

/**
 * S6 de `intervenciones-ux` contra Postgres real: la calle de otro
 * asentamiento no se guarda, y el rechazo no deja rastro -ni intervencion, ni
 * bitacora, ni revision-.
 *
 * Vive junto al caso de uso y no en `registro.integration.test.ts` porque ese
 * archivo ya usa su presupuesto de 200 lineas (`AGENTS.md`, Metricas).
 */
let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones, reportes, movimientos_de_reportes, folios_de_reportes`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const admin = () => contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

const comisariaDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    admin(),
  );
  return id;
};

const coloniaDe = async (nombre: string, padreId: LugarId) => {
  const { id } = await altaDeLugar(
    { tipo: "colonia", nombre, padreId },
    admin(),
  );
  return id;
};

const calleDe = async (nombre: string, lugarId: LugarId) => {
  const { id } = await altaDeCalle({ nombre, lugarId }, admin());
  return id;
};

const rastro = () =>
  withTenant(motul, async (tx) => ({
    intervenciones: (await tx.select().from(intervenciones)).length,
    revisiones: (await tx.select().from(revisionesDeIntervenciones)).length,
    trazas: (
      await tx
        .select()
        .from(bitacora)
        .where(eq(bitacora.accion, "REGISTRAR_INTERVENCION"))
    ).length,
  }));

describe("registro real: la calle cuelga del asentamiento del lugar", () => {
  it("rechaza la calle de otro asentamiento sin escribir intervencion, bitacora ni revision", async () => {
    const asentamiento = await comisariaDe("Comisaria Calle Propia S6");
    const otroAsentamiento = await comisariaDe("Comisaria Calle Ajena S6");
    const colonia = await coloniaDe("Colonia Calle S6", asentamiento);
    const calleAjena = await calleDe("Calle Ajena S6", otroAsentamiento);
    const antes = await rastro();

    await expect(
      registrarIntervencion(
        {
          tipo: "FUGA",
          fechaDeOcurrencia: "2026-01-15",
          lugarId: colonia,
          calleId: calleAjena,
          reporteId: null,
          descripcion: "Fuga de agua frente a la colonia",
        },
        admin(),
      ),
    ).rejects.toBeInstanceOf(CalleFueraDelLugarError);

    expect(await rastro()).toEqual(antes);
    expect(antes).toEqual({ intervenciones: 0, revisiones: 0, trazas: 0 });
  });

  it("guarda la calle del asentamiento que contiene a la colonia", async () => {
    const asentamiento = await comisariaDe("Comisaria Calle Del Lugar S6");
    const colonia = await coloniaDe("Colonia Calle Del Lugar S6", asentamiento);
    const calle = await calleDe("Calle Del Lugar S6", asentamiento);

    const id = await registrarIntervencion(
      {
        tipo: "FUGA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId: colonia,
        calleId: calle,
        reporteId: null,
        descripcion: "Fuga de agua frente a la colonia",
      },
      admin(),
    );

    expect(await rastro()).toMatchObject({ intervenciones: 1, trazas: 1 });
    const [guardada] = await withTenant(motul, (tx) =>
      tx.select().from(intervenciones).where(eq(intervenciones.id, id)),
    );
    expect(guardada).toMatchObject({ lugarId: colonia, calleId: calle });
  });
});
