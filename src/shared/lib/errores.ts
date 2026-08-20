import { datosSegurosDeError } from "./registroDeError";

/**
 * Errores transversales. Los de negocio viven en el dominio de cada
 * modulo (`modules/<mod>/domain/errors.ts`); estos son los que puede
 * lanzar cualquier capa salvo `domain`.
 *
 * Todos llevan un `codigo` estable. El despacho se hace por ese codigo y
 * no por `instanceof`: un error que cruza un limite de modulo o que se
 * serializa hacia una Server Action pierde su prototipo, y ahi el
 * `instanceof` deja de ser cierto sin avisar.
 *
 * Ver ADR 0001 seccion 3.
 */

export class NoAutorizadoError extends Error {
  readonly codigo = "NO_AUTORIZADO";

  constructor(mensaje = "No tiene permiso para esta operacion.") {
    super(mensaje);
    this.name = "NoAutorizadoError";
  }
}

/**
 * Lo que se responde cuando el recurso no existe **para quien pregunta**.
 *
 * Un recurso de otro ayuntamiento cae aca, no en `NoAutorizadoError`. La
 * diferencia no es cosmetica: un 403 confirma que el recurso existe, y con
 * un id enumerado eso alcanza para mapear el padron de otro municipio.
 * Fuera del tenant propio, "no existe" y "no te lo puedo mostrar" tienen
 * que ser la misma respuesta.
 */
export class NoEncontradoError extends Error {
  readonly codigo = "NO_ENCONTRADO";

  constructor(mensaje = "El recurso no existe.") {
    super(mensaje);
    this.name = "NoEncontradoError";
  }
}

export class TenantNoResueltoError extends Error {
  readonly codigo = "TENANT_NO_RESUELTO";

  constructor(mensaje = "No se pudo determinar el ayuntamiento del acceso.") {
    super(mensaje);
    this.name = "TenantNoResueltoError";
  }
}

export class ValidacionError extends Error {
  readonly codigo = "VALIDACION";

  /**
   * Errores por campo, para que el formulario pueda pintarlos donde
   * corresponde en vez de mostrar un mensaje suelto arriba.
   */
  readonly campos: Record<string, string>;

  constructor(
    campos: Record<string, string> = {},
    mensaje = "Datos invalidos.",
  ) {
    super(mensaje);
    this.name = "ValidacionError";
    this.campos = campos;
  }
}

/**
 * Lo que devuelve una Server Action al cliente. Nunca una excepcion cruda
 * (ADR 0001 seccion 4): lo que Next serializa de un `throw` pierde el
 * prototipo, y del otro lado un `catch (e) { if (e instanceof X) }` deja de
 * ser cierto sin avisar.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      codigo: string;
      mensaje: string;
      /** Solo presente cuando `codigo` es `VALIDACION`. */
      campos?: Record<string, string>;
    };

/** Los `codigo` que este archivo declara. Cualquier otro cae en `ERROR_INTERNO`. */
const CODIGOS_CONOCIDOS = [
  "NO_AUTORIZADO",
  "NO_ENCONTRADO",
  "VALIDACION",
  "TENANT_NO_RESUELTO",
] as const;

type CodigoConocido = (typeof CODIGOS_CONOCIDOS)[number];

const esCodigoConocido = (valor: unknown): valor is CodigoConocido =>
  typeof valor === "string" &&
  (CODIGOS_CONOCIDOS as readonly string[]).includes(valor);

/**
 * Traduce cualquier error atrapado en el borde de una Server Action a un
 * `ActionResult`. Despacha por `codigo`, **nunca por `instanceof`**: es el
 * unico despacho que sobrevive a un error que cruzo un limite de
 * serializacion y perdio su prototipo.
 *
 * Lo que no trae un `codigo` conocido cae en `ERROR_INTERNO` con un mensaje
 * generico — el original queda solo en el log del servidor, reducido por
 * `datosSegurosDeError`, para no filtrar configuracion ni datos de fila al
 * cliente.
 */
export function mapearError(error: unknown): ActionResult<never> {
  const codigo = (error as { codigo?: unknown } | null)?.codigo;
  const mensaje = error instanceof Error ? error.message : "Datos invalidos.";

  if (esCodigoConocido(codigo)) {
    if (codigo === "VALIDACION") {
      const campos = (error as ValidacionError).campos ?? {};

      return { ok: false, codigo, mensaje, campos };
    }

    return { ok: false, codigo, mensaje };
  }

  console.error("[accion] fallo no manejado", datosSegurosDeError(error));

  return {
    ok: false,
    codigo: "ERROR_INTERNO",
    mensaje: "No se pudo completar la operacion. Intente de nuevo.",
  };
}
