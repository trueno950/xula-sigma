import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/shared/auth/alta";
import { usuarios } from "@/shared/auth/esquema";
import {
  CLAVE_INICIAL,
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
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
import { altaDeUsuario } from "./composicion";
import { violaRestriccionUnica } from "./infrastructure/violacionDeRestriccion";

/**
 * El correo es la credencial de entrada, y su unicidad tiene que valer para
 * `Ana@motul.mx` y `ana@motul.mx` a la vez.
 *
 * El alta del panel normaliza a minusculas, asi que por esa puerta las dos
 * formas son la misma cadena y el indice exacto alcanza. **La primitiva
 * `altaDePersona` no normaliza** —es la que usan el provisionamiento del
 * primer administrador y la siembra— y ahi el indice exacto
 * (`usuarios_tenant_email_idx`) deja entrar las dos: para Postgres son
 * textos distintos. El resultado es una cuenta muda: existe, tiene clave, y
 * el acceso la busca en minusculas. El indice por `lower(email)`
 * (`0024`) es lo que lo impide, porque el limite lo pone Postgres y no el
 * codigo que se acuerde de normalizar.
 */

let gente: GentePorMunicipio;

const altaDirecta = (nombre: string, email: string) =>
  withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre,
      email,
      clave: CLAVE_INICIAL,
      rol: "OPERADOR",
    }),
  );

const altaDelPanel = (email: string) =>
  altaDeUsuario(contextoDe(gente, "motul", "ADMIN_MUNICIPAL"), {
    nombre: "Persona En Carrera",
    email,
    rol: "OPERADOR",
  });

const personas = () => withTenant(motul, (tx) => tx.select().from(usuarios));

const conEseCorreo = async (email: string) =>
  (await personas()).filter(
    (persona) => persona.email.toLowerCase() === email.toLowerCase(),
  );

const desenlaceDe = (trabajo: Promise<unknown>) =>
  trabajo.then(
    () => "paso" as const,
    (error: unknown) => error,
  );

/**
 * Un alta que espera el indice es un pedido de lock sin otorgar. Es la unica
 * señal que distingue «esta bloqueada por la fila sin confirmar» de «no
 * choco con nadie», y sin ella la asercion de abajo pasaria siempre.
 *
 * Se pregunta a `pg_locks` y no a `pg_stat_activity`: un rol sin
 * `pg_read_all_stats` ve las sesiones ajenas con sus columnas en `NULL`, y
 * entonces `state = 'active'` no matchea nunca y el sondeo mira el vacio.
 */
const hayUnaEspera = async (): Promise<boolean> => {
  const [fila] = await owner<{ esperando: number }[]>`
    SELECT count(*)::int AS esperando FROM pg_locks WHERE NOT granted
  `;

  return (fila?.esperando ?? 0) > 0;
};

const esperarLaEspera = async (alta: Promise<unknown>): Promise<boolean> => {
  let termino = false;
  void alta.then(() => {
    termino = true;
  });

  for (let intento = 0; intento < 250; intento += 1) {
    // Sin el indice el alta no choca con la fila sin confirmar: resuelve.
    if (termino) return false;
    if (await hayUnaEspera()) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return false;
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

describe("unicidad del correo por lower(email)", () => {
  it("dos altas simultaneas del panel que solo difieren en mayusculas dejan una sola cuenta", async () => {
    const [primera, segunda] = await Promise.allSettled([
      altaDelPanel("Carrera@motul.example.com"),
      altaDelPanel("carrera@motul.example.com"),
    ]);

    expect(
      [primera, segunda].filter((r) => r.status === "fulfilled"),
    ).toHaveLength(1);

    const rechazada = [primera, segunda].find((r) => r.status === "rejected");
    expect(rechazada?.reason).toMatchObject({ codigo: "CORREO_YA_REGISTRADO" });
    expect(await conEseCorreo("carrera@motul.example.com")).toHaveLength(1);
  });

  /**
   * La carrera de verdad, por la primitiva que no normaliza: la fila en
   * conflicto existe pero **no esta confirmada**, asi que ningun chequeo
   * previo puede verla y el `INSERT` se queda esperando el indice. Sin
   * `enTransaccionParalela` -una segunda conexion real, ajena al pool de
   * `DB_POOL_MAX=1`- las dos altas se serializan y el agujero no aparece.
   */
  it("la fila sin confirmar que ningun chequeo previo ve la frena el indice", async () => {
    let liberarParalela: () => void = () => {};
    const puedeConfirmar = new Promise<void>((resolve) => {
      liberarParalela = resolve;
    });

    const paralela = enTransaccionParalela(motul, async (tx) => {
      await tx`
        INSERT INTO usuarios (ayuntamiento_id, name, email, rol)
        VALUES (${motul}, 'Persona En Carrera', 'carrera-real@motul.example.com', 'OPERADOR')
      `;
      await puedeConfirmar;
    });

    // Le da tiempo a la paralela de insertar y quedarse sin confirmar.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const alta = desenlaceDe(
      altaDirecta("Persona En Carrera", "Carrera-Real@motul.example.com"),
    );
    const espero = await esperarLaEspera(alta);

    liberarParalela();
    await paralela;

    // Lo que este test existe para probar: sin el indice, el alta no choca
    // con la fila sin confirmar, resuelve antes y esta linea falla.
    expect(espero).toBe(true);
    expect(
      violaRestriccionUnica(await alta, "usuarios_tenant_email_lower_idx"),
    ).toBe(true);
    expect(await conEseCorreo("carrera-real@motul.example.com")).toHaveLength(
      1,
    );
  });

  it("el indice que lo impide compara por lower(email)", async () => {
    await altaDirecta("Indice Primera", "indice@motul.example.com");
    const fallo = await motivoDe(() =>
      altaDirecta("Indice Segunda", "INDICE@motul.example.com"),
    );

    expect(
      violaRestriccionUnica(fallo, "usuarios_tenant_email_lower_idx"),
    ).toBe(true);
    expect(
      await withTenant(motul, (tx) =>
        tx
          .select()
          .from(usuarios)
          .where(eq(usuarios.email, "INDICE@motul.example.com")),
      ),
    ).toHaveLength(0);
  });
});
