import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  subdominioMotul,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { altaDePersona } from "./alta";
import { usuarios } from "./esquema";

/**
 * `rol` y `ayuntamientoId` viajan en la sesion, y por eso estan declarados
 * en `additionalFields`. Este archivo prueba que declararlos no los volvio
 * escribibles.
 *
 * Con el valor por defecto —`input: true`— la libreria sirve la escalada:
 * `POST /api/auth/update-user` con `{"rol":"ADMIN_MUNICIPAL"}` responde 200
 * y **cambia la fila**. Provocado, no supuesto. Lo corta `input: false`, que
 * hace fallar a `parseInputData` con `FIELD_NOT_ALLOWED` antes de tocar la
 * base (`db/schema.mjs:65` en 1.6.29).
 *
 * Vive aparte de `contexto.integration.test.ts` porque prueba
 * `configuracion.ts`, no `contexto.ts`. Es una linea de configuracion que
 * nada mas vigila y que se pierde en cualquier refactor de ese objeto.
 */

const CORREO = "consulta@example.com";
const CLAVE = "clave-larga-y-buena";
const ORIGEN = `http://${subdominioMotul}.localhost:3000`;

// Todo el archivo ocurre en Motul: el cruce entre municipios se prueba en
// `accesoCruzado`, aca lo que se prueba es el campo.
vi.mock("@/shared/tenancy/contexto", () => ({
  ayuntamientoActual: async () => ({
    id: motul,
    subdominio: subdominioMotul,
  }),
}));

const { manejarAuth } = await import("./instancia");

async function acceder() {
  const respuesta = await manejarAuth(
    new Request(`${ORIGEN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: CORREO, password: CLAVE }),
    }),
  );

  expect(respuesta.status).toBe(200);

  const cookie = respuesta.headers.get("set-cookie");

  if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

  return cookie.split(";")[0] as string;
}

const actualizar = (cookie: string, cuerpo: unknown) =>
  manejarAuth(
    new Request(`${ORIGEN}/api/auth/update-user`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(cuerpo),
    }),
  );

const personaDePrueba = () =>
  withTenant(motul, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.email, CORREO)),
  );

beforeAll(async () => {
  await sembrar();

  await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Quien Consulta",
      email: CORREO,
      clave: CLAVE,
      rol: "CONSULTA",
    }),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("campos que el cliente no puede escribir", () => {
  it("update-user con rol no asciende a nadie", async () => {
    const respuesta = await actualizar(await acceder(), {
      rol: "ADMIN_MUNICIPAL",
    });

    /**
     * La fila primero: es lo que decide si hubo escalada. El status es como
     * se entero el cliente, y con la fila ya cambiada llega tarde.
     */
    const [persona] = await personaDePrueba();

    expect(persona?.rol).toBe("CONSULTA");
    expect(respuesta.status).not.toBe(200);
  });

  it("update-user con ayuntamientoId no muda a nadie de municipio", async () => {
    const respuesta = await actualizar(await acceder(), {
      ayuntamientoId: ticul,
    });

    const [persona] = await personaDePrueba();

    expect(persona?.ayuntamientoId).toBe(motul);
    expect(respuesta.status).not.toBe(200);
  });

  it("un campo que si es de entrada sigue funcionando", async () => {
    /**
     * Control positivo. Sin esto, un `update-user` roto —o apagado— dejaria
     * verdes los dos de arriba sin probar que la proteccion es de `rol` y
     * `ayuntamientoId` y no del endpoint entero.
     */
    const respuesta = await actualizar(await acceder(), {
      name: "Nombre Cambiado",
    });

    const [persona] = await personaDePrueba();

    expect(respuesta.status).toBe(200);
    expect(persona?.name).toBe("Nombre Cambiado");
  });
});
