import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { exportarAyuntamiento, type PorcionExportable } from "./exportar";

/**
 * La entrega de datos a un municipio que se va.
 *
 * Es la superficie con mas datos personales del sistema: por definicion
 * saca todo lo de un ayuntamiento de una sola vez. Los dos escenarios que
 * importan son que no se lleve nada del municipio de al lado, y que no se
 * lleve credenciales.
 */

let gente: GentePorMunicipio;

const actor = (
  municipio: "motul" | "ticul",
  rol: Parameters<typeof contextoDe>[2],
) => contextoDe(gente, municipio, rol);

/**
 * El conjunto, o falla el test.
 *
 * `conjuntos` es un mapa que los modulos pueblan en tiempo de ejecucion,
 * asi que indexarlo da `| undefined` y eso es correcto: un consumidor real
 * no puede saber que porciones se compusieron. Aca si se sabe, y un
 * conjunto ausente es una falla, no un caso a contemplar.
 */
const conjunto = (
  exportacion: { conjuntos: Record<string, readonly unknown[]> },
  nombre: string,
): readonly unknown[] => {
  const filas = exportacion.conjuntos[nombre];

  if (!filas) throw new Error(`La exportacion no trajo "${nombre}".`);

  return filas;
};

const trazasDeExportacion = () =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.accion, "EXPORTAR_AYUNTAMIENTO"))
      .orderBy(bitacora.ocurridoEn),
  );

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("exportarAyuntamiento", () => {
  it("solo trae los datos del municipio de quien exporta", async () => {
    const exportacion = await exportarAyuntamiento(
      actor("motul", "ADMIN_MUNICIPAL"),
      [],
    );

    expect(exportacion.ayuntamiento.id).toBe(motul);

    // Los cuatro roles sembrados en Motul y ninguno de Ticul, que tiene
    // otros cuatro con los mismos nombres de rol.
    const correos = conjunto(exportacion, "usuarios").map(
      (u) => (u as { email: string }).email,
    );

    expect(correos).toHaveLength(4);
    expect(correos.every((c) => c.endsWith("@motul.example.com"))).toBe(true);
  });

  it("no exporta credenciales", async () => {
    /**
     * Que tablas no salen y por que, en `exportar.ts`. Lo que agrega este
     * test es la forma del assert: va contra el JSON entero y no contra la
     * lista de conjuntos, porque exportar una tabla nueva con credenciales
     * adentro no rompe un assert que solo mire nombres, y si rompe este.
     */
    const exportacion = await exportarAyuntamiento(
      actor("motul", "ADMIN_MUNICIPAL"),
      [],
    );

    const texto = JSON.stringify(exportacion);

    expect(texto).not.toMatch(/\$argon2/);
    expect(texto).not.toMatch(/"password"/);
    expect(texto).not.toMatch(/"token"/);
  });

  it("cada exportacion deja su traza en bitacora", async () => {
    // Se cuenta el delta y no el total: los otros tests de este archivo
    // tambien exportan, y un assert sobre el total se rompe cada vez que
    // se agrega uno. Ademas el delta es la afirmacion real —una
    // exportacion, una traza— y el total no lo es.
    const contexto = actor("motul", "ADMIN_MUNICIPAL");
    const antes = await trazasDeExportacion();

    await exportarAyuntamiento(contexto, []);

    const despues = await trazasDeExportacion();
    const nueva = despues.at(-1);

    expect(despues).toHaveLength(antes.length + 1);
    expect(nueva?.actor).toBe(contexto.usuario.id);
    expect(nueva?.origen).toBe(contexto.origen);
  });

  it("un rol que no administra no puede exportar", async () => {
    const motivo = await motivoDe(() =>
      exportarAyuntamiento(actor("motul", "OPERADOR"), []),
    );

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
  });

  it("la porcion que aporta un modulo corre dentro del tenant", async () => {
    // Por que la porcion recibe la transaccion y no un manejador, en
    // `PorcionExportable`. La consulta de abajo sale a proposito sin
    // `where` de tenant: es la forma de provocarlo.
    const porcion: PorcionExportable = {
      nombre: "prueba",
      leer: (tx) => tx.select().from(bitacora),
    };

    const exportacion = await exportarAyuntamiento(
      actor("motul", "ADMIN_MUNICIPAL"),
      [porcion],
    );

    const filas = conjunto(exportacion, "prueba");
    const ajenas = filas.filter(
      (f) => (f as { ayuntamientoId: string }).ayuntamientoId !== motul,
    );

    /**
     * La precondicion se afirma, no se supone: sin filas de Ticul en
     * `bitacora`, `ajenas` da vacio aunque la tabla no tuviera RLS y el
     * test pasaria sin probar nada. `sembrar()` las escribe, pero eso vive
     * en otro archivo y desde aca no se ve.
     *
     * Se cuentan con el tenant de Ticul y no con el rol owner: `bitacora`
     * tiene FORCE sin excepcion para el dueno, asi que un `count` del owner
     * devuelve cero y no distingue "no hay filas" de "RLS me las esconde".
     */
    const deTicul = await withTenant(ticul, (tx) => tx.select().from(bitacora));

    expect(deTicul.length).toBeGreaterThan(0);
    expect(filas.length).toBeGreaterThan(0);
    expect(ajenas).toHaveLength(0);
  });
});
