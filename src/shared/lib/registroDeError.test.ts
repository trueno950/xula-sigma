import { describe, expect, it } from "vitest";
import { datosSegurosDeError } from "./registroDeError";

/** Un error de postgres.js con la forma que tiene de verdad. */
function errorDePostgres(mensaje: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(mensaje), {
    name: "PostgresError",
    code: "23505",
    severity: "ERROR",
    constraint_name: "usuarios_tenant_email_idx",
    table_name: "usuarios",
    ...extra,
  });
}

describe("datosSegurosDeError", () => {
  it("no deja pasar el correo que Postgres incrusta en el mensaje", () => {
    const error = errorDePostgres(
      'duplicate key value violates unique constraint "usuarios_tenant_email_idx"\n' +
        "Key (ayuntamiento_id, email)=(abc, tesoreria@example.com) already exists.",
    );

    const texto = JSON.stringify(datosSegurosDeError(error));

    expect(texto).not.toContain("tesoreria@example.com");
    expect(texto).not.toContain("already exists");
  });

  it("no deja pasar los params que agrega drizzle", () => {
    const envoltorio = Object.assign(
      new Error(
        "Failed query: insert into usuarios ...\nparams: abc,Juan Perez,juan@example.com",
      ),
      { cause: errorDePostgres("null value in column") },
    );

    const texto = JSON.stringify(datosSegurosDeError(envoltorio));

    expect(texto).not.toContain("Juan Perez");
    expect(texto).not.toContain("juan@example.com");
    expect(texto).not.toContain("params");
  });

  it("conserva lo que sirve para arreglar el problema", () => {
    const { campos } = datosSegurosDeError(errorDePostgres("lo que sea"));

    expect(campos).toMatchObject({
      name: "PostgresError",
      code: "23505",
      constraint_name: "usuarios_tenant_email_idx",
      table_name: "usuarios",
    });
  });

  it("saca los campos del error de adentro cuando drizzle lo envuelve", () => {
    const envoltorio = Object.assign(new Error("Failed query"), {
      cause: errorDePostgres("null value in column"),
    });

    expect(datosSegurosDeError(envoltorio).campos).toMatchObject({
      code: "23505",
      table_name: "usuarios",
    });
  });

  it("conserva el nombre especifico, no el del envoltorio", () => {
    /**
     * `name` esta en `Error.prototype`, asi que el envoltorio de drizzle
     * —un `Error` pelado— responde `"Error"` aunque nadie se lo haya
     * puesto. Tomando el primero que aparece, ese generico le gana al
     * `PostgresError` de adentro y el log pierde la senial de que el fallo
     * fue de base de datos, que es justo lo que se va a buscar.
     */
    const envoltorio = Object.assign(new Error("Failed query"), {
      cause: errorDePostgres("null value in column"),
    });

    expect(datosSegurosDeError(envoltorio).campos.name).toBe("PostgresError");
  });

  it("un campo nuevo de la libreria no se cuela", () => {
    /**
     * Es lo que distingue la lista blanca de la lista negra. `detail` de
     * postgres.js lleva el `Key (email)=(...)`; el dia que la libreria
     * agregue otro campo con valores, tampoco tiene que salir.
     */
    const error = errorDePostgres("lo que sea", {
      detail: "Key (email)=(tesoreria@example.com) already exists.",
      campoInventadoDeLaProximaVersion: "domicilio: calle 21 numero 100",
    });

    const texto = JSON.stringify(datosSegurosDeError(error));

    expect(texto).not.toContain("tesoreria@example.com");
    expect(texto).not.toContain("calle 21");
  });

  it("la traza no arrastra el mensaje de la primera linea", () => {
    const error = new Error("motivo con datos: juan@example.com");
    const { traza } = datosSegurosDeError(error);

    expect(traza).not.toContain("juan@example.com");
    // Pero sigue habiendo traza: sin ella el log no sirve para nada.
    expect(traza).toContain("registroDeError.test.ts");
  });

  it("no se cuelga con una cadena de causas circular", () => {
    const a = new Error("a");
    const b = Object.assign(new Error("b"), { cause: a });
    Object.assign(a, { cause: b });

    expect(() => datosSegurosDeError(b)).not.toThrow();
  });

  it("aguanta algo que no es un Error", () => {
    expect(datosSegurosDeError("un string suelto").campos.name).toBe("string");
    expect(datosSegurosDeError(null).campos.name).toBe("object");
  });
});
