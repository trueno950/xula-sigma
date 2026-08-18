import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { darDeBajaUsuario } from "./administracionDeUsuarios";
import { usuarios } from "./esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "./genteDePrueba";

let gente: GentePorMunicipio;

const actor = (
  municipio: "motul" | "ticul",
  rol: Parameters<typeof contextoDe>[2],
) => contextoDe(gente, municipio, rol);

const personaDe = async (
  ayuntamientoId: typeof motul | typeof ticul,
  usuarioId: string,
) => {
  const [persona] = await withTenant(ayuntamientoId, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)),
  );

  return persona;
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("darDeBajaUsuario", () => {
  it("ADMIN_MUNICIPAL da de baja a su OPERADOR sin borrar la fila", async () => {
    const objetivo = gente.motul.OPERADOR;

    await darDeBajaUsuario(actor("motul", "ADMIN_MUNICIPAL"), {
      usuarioId: objetivo,
    });

    const persona = await personaDe(motul, objetivo);

    // La fila sigue: es lo que conserva la autoria de lo que ya emitio.
    expect(persona?.id).toBe(objetivo);
    expect(persona?.bajaEn).not.toBeNull();
  });

  it("la baja conserva las trazas que referencian a esa persona", async () => {
    const trazas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(bitacora)
        .where(eq(bitacora.entidadId, gente.motul.OPERADOR)),
    );

    expect(trazas).toHaveLength(1);
    expect(trazas[0]?.accion).toBe("BAJA_USUARIO");
  });

  it("CONSULTA no da de baja a nadie", async () => {
    const objetivo = gente.motul.ADMIN_MUNICIPAL;

    const fallo = await motivoDe(() =>
      darDeBajaUsuario(actor("motul", "CONSULTA"), { usuarioId: objetivo }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await personaDe(motul, objetivo))?.bajaEn).toBeNull();
  });

  it("dar de baja a alguien de otro municipio es NO_ENCONTRADO", async () => {
    const objetivo = gente.ticul.CONSULTA;

    const fallo = await motivoDe(() =>
      darDeBajaUsuario(actor("motul", "ADMIN_MUNICIPAL"), {
        usuarioId: objetivo,
      }),
    );

    expect(fallo.codigo).toBe("NO_ENCONTRADO");
    expect((await personaDe(ticul, objetivo))?.bajaEn).toBeNull();
  });

  it("nadie da de baja a un SUPER_ADMIN", async () => {
    const objetivo = gente.motul.SUPER_ADMIN;

    const fallo = await motivoDe(() =>
      darDeBajaUsuario(actor("motul", "ADMIN_MUNICIPAL"), {
        usuarioId: objetivo,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await personaDe(motul, objetivo))?.bajaEn).toBeNull();
  });

  it("SUPER_ADMIN no da de baja: destraba, no administra", async () => {
    const objetivo = gente.motul.CONSULTA;

    const fallo = await motivoDe(() =>
      darDeBajaUsuario(actor("motul", "SUPER_ADMIN"), { usuarioId: objetivo }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await personaDe(motul, objetivo))?.bajaEn).toBeNull();
  });
});
