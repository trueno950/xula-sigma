import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  ConstanciaId,
  MotivoDeCancelacion,
  MotivoDeReimpresion,
  ReimpresionId,
  TipoDeDocumento,
} from "../domain";

/**
 * Lo que `emitirConstancia` guarda en una sola fila (design.md de
 * `constancias-oficios`, seccion 6): `folio` ya viene formateado -no se
 * re-deriva de `anio`+`consecutivo` en la lectura-, y `personaId` viaja como
 * `string`, nunca `PersonaId` (seccion 3: el dominio de `constancias` no
 * importa el de `padron`).
 */
export type DatosParaGuardar = {
  id: ConstanciaId;
  ayuntamientoId: AyuntamientoId;
  tipo: TipoDeDocumento;
  folio: string;
  anio: number;
  consecutivo: number;
  codigoVerificacion: string;
  personaId: string;
  datos: Record<string, unknown>;
  plantillaVersion: string;
  emitidaPorUsuarioId: string;
};

/** Lo que devuelve una lectura: los mismos campos mas lo que solo existe una vez guardada. */
export type ConstanciaGuardada = DatosParaGuardar & {
  emitidaEn: Date;
  canceladaEn: Date | null;
  canceladaPorUsuarioId: string | null;
  motivoCancelacion: MotivoDeCancelacion | null;
};

/**
 * Lo que lee `paraValidar` para la superficie publica (design.md seccion 8):
 * datos crudos, sin el snapshot resuelto. `application/validarFolio.ts` lo
 * traduce a `FilaDeValidacion` -mismo criterio que `pdfDeConstancia.ts`, que
 * resuelve `esquemaDeSnapshot.parse(constancia.datos)` fuera de
 * `infrastructure`, nunca adentro.
 */
export type FilaParaValidar = {
  tipo: TipoDeDocumento;
  emitidaEn: Date;
  canceladaEn: Date | null;
  codigoVerificacion: string;
  datos: Record<string, unknown>;
};

/**
 * Puerto de escritura y lectura de `constancias` y `reimpresiones`. Cada
 * operacion recibe la transaccion de `withTenant` por parametro, mismo
 * criterio que `RepositorioDeDocumentos` (`puertosDeLectura.ts`).
 */
export type RepositorioDeConstancias = {
  guardar(tx: TransaccionTenant, datos: DatosParaGuardar): Promise<void>;
  buscarPorId(
    tx: TransaccionTenant,
    id: ConstanciaId,
  ): Promise<ConstanciaGuardada | null>;
  /**
   * Igual que `buscarPorId`, pero con `SELECT ... FOR UPDATE`: toma el lock
   * de fila que `reimprimirConstancia` necesita para que su lectura de
   * `canceladaEn` y el `INSERT` en `reimpresiones` sean atomicos frente a un
   * `cancelarConstancia` concurrente (hallazgo de GGA en la revision de esta
   * rebanada). `cancelar` ya es atomico consigo mismo -su propio
   * `UPDATE ... WHERE cancelada_en IS NULL`-, pero eso no alcanza cuando el
   * lado de "reimprimir" lee esa misma columna sin bloquearla: sin este
   * lock, una cancelacion podria confirmar entre la lectura y el `INSERT`,
   * dejando una reimpresion de un documento ya cancelado.
   */
  bloquearPorId(
    tx: TransaccionTenant,
    id: ConstanciaId,
  ): Promise<ConstanciaGuardada | null>;
  listar(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
  ): Promise<readonly ConstanciaGuardada[]>;
  /** design.md seccion 13: superficie publica de `/validar/[folio]`. */
  paraValidar(
    tx: TransaccionTenant,
    folio: string,
  ): Promise<FilaParaValidar | null>;
  registrarReimpresion(
    tx: TransaccionTenant,
    datos: {
      ayuntamientoId: AyuntamientoId;
      constanciaId: ConstanciaId;
      usuarioId: string;
      motivo: MotivoDeReimpresion;
    },
  ): Promise<ReimpresionId>;
  /**
   * Acredita una reimpresion para el PDF (design.md de `constancias-oficios`,
   * seccion 11): `true` solo si `id` existe **y** es de `constanciaId` -el FK
   * compuesto `(constanciaId, ayuntamientoId)` de `reimpresiones`, con el
   * `ayuntamientoId` ya acotado por RLS dentro del mismo `withTenant` que
   * `pdfDeConstancia` abrio para leer la constancia-. `pdfDeConstancia` nunca
   * renderiza sin que esto responda `true`.
   */
  existeReimpresion(
    tx: TransaccionTenant,
    id: ReimpresionId,
    constanciaId: ConstanciaId,
  ): Promise<boolean>;
  cancelar(
    tx: TransaccionTenant,
    datos: {
      id: ConstanciaId;
      motivo: MotivoDeCancelacion;
      usuarioId: string;
    },
  ): Promise<boolean>;
};

/**
 * El contador de folios (design.md seccion 4): una sola sentencia,
 * `ON CONFLICT (ayuntamiento_id, tipo, anio) DO UPDATE`, con el lock que
 * garantiza un consecutivo sin hueco y sin repeticion. Es la unica
 * operacion de este modulo que se declara "no medida" hasta que
 * `folio.integration.test.ts` corre contra Postgres de verdad.
 */
export type ContadorDeFolios = {
  siguiente(
    tx: TransaccionTenant,
    datos: {
      ayuntamientoId: AyuntamientoId;
      tipo: TipoDeDocumento;
      anio: number;
    },
  ): Promise<number>;
};
