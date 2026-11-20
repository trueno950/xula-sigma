import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  altaDeCalle,
  altaDeLugar,
  type LugarId,
  reparentearLugar,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { corregirIntervencion, registrarIntervencion } from "./composicion";
import { intervencionPorId, trazasDeCorreccion } from "./correccionDePrueba";
import { CalleFueraDelLugarError } from "./domain";
import { revisionesDeIntervenciones } from "./infrastructure/esquema";

/**
 * S6 de `intervenciones-ux`, el caso que el alta no puede ver: una colonia con
 * la intervencion ya guardada se mueve a otra comisaria (`reparentearLugar`,
 * que admite hacerlo con trabajo escrito), asi que la pareja guardada deja de
 * ser coherente sin dejar de existir.
 *
 * - Corregir la descripcion conservando la pareja sigue guardando: si no, la
 *   fila quedaria imposible de editar.
 * - Elegir una calle del asentamiento anterior se rechaza sin escribir.
 *
 * Vive junto al caso de uso y no en `correccion.integration.test.ts` porque ese
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

const revisiones = () =>
  withTenant(motul, (tx) => tx.select().from(revisionesDeIntervenciones));

describe("correccion real: la calle cuelga del asentamiento del lugar", () => {
  it("una colonia reparentada conserva su pareja guardada y rechaza la calle del asentamiento anterior", async () => {
    const origen = await comisariaDe("Comisaria Movida Origen S6");
    const destino = await comisariaDe("Comisaria Movida Destino S6");
    const colonia = await coloniaDe("Colonia Movida S6", origen);
    const calleVieja = await calleDe("Calle Movida Vieja S6", origen);
    const otraCalleVieja = await calleDe("Calle Movida Vieja Dos S6", origen);
    const calleNueva = await calleDe("Calle Movida Nueva S6", destino);

    const original = {
      tipo: "OBRA" as const,
      fechaDeOcurrencia: "2026-01-15",
      lugarId: colonia,
      calleId: calleVieja,
      reporteId: null,
      descripcion: "Rehabilitacion de la calle de la colonia",
    };
    const id = await registrarIntervencion(original, admin());

    await reparentearLugar(colonia, destino, admin());

    // La pareja guardada ya es incoherente y la correccion no la toca.
    await corregirIntervencion(
      { ...original, id, descripcion: "Rehabilitacion corregida de la calle" },
      admin(),
    );
    await expect(intervencionPorId(motul, id)).resolves.toMatchObject({
      descripcion: "Rehabilitacion corregida de la calle",
      lugarId: colonia,
      calleId: calleVieja,
    });

    // Elegir otra calle del asentamiento anterior si cambia la ubicacion.
    const revisionesAntes = await revisiones();
    const trazasAntes = await trazasDeCorreccion();

    await expect(
      corregirIntervencion(
        { ...original, id, calleId: otraCalleVieja },
        admin(),
      ),
    ).rejects.toBeInstanceOf(CalleFueraDelLugarError);

    await expect(intervencionPorId(motul, id)).resolves.toMatchObject({
      calleId: calleVieja,
    });
    expect(await revisiones()).toHaveLength(revisionesAntes.length);
    expect(await trazasDeCorreccion()).toHaveLength(trazasAntes.length);

    // Y una calle del asentamiento nuevo si es coherente.
    await corregirIntervencion(
      { ...original, id, calleId: calleNueva },
      admin(),
    );
    await expect(intervencionPorId(motul, id)).resolves.toMatchObject({
      calleId: calleNueva,
    });
  });
});
