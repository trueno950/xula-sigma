/**
 * `darDeBajaLugar` rechaza si el lugar tiene hijos activos o domicilios
 * colgados (design.md seccion 8). No es un FK: la baja es logica y
 * Postgres no la ve como un DELETE, asi que `ON DELETE RESTRICT` no
 * aplica — la regla vive aca, no en el esquema.
 */
export class LugarConDependientesError extends Error {
  readonly codigo = "LUGAR_CON_DEPENDIENTES";

  constructor(mensaje = "El lugar tiene hijos activos o domicilios colgados.") {
    super(mensaje);
    this.name = "LugarConDependientesError";
  }
}

/**
 * Un lugar sin padre que no es del rango superior.
 *
 * `openspec/specs/jerarquia-territorial` lo pide como MUST: "Una fila de
 * tipo `cabecera` o `comisaria` MUST tener `padreId IS NULL`; ningun otro
 * tipo MUST tener `padreId NULL`". Es un error aparte de
 * `JerarquiaInvalidaError` porque no hay ningun padre del cual hablar: el
 * mensaje "Ese lugar no puede contener a este" no le sirve a nadie cuando
 * el problema es que no se eligio ninguno.
 *
 * No confundir con la raggedness (design.md decision 6), que es poder
 * saltear niveles —un sector colgado directo de una comisaria, sin colonia
 * intermedia—. Un `padreId NULL` en un tipo que no es rango 0 significa
 * "sin padre conocido", nunca "esto es la cabecera": lo dice el mismo spec.
 */
export class RaizInvalidaError extends Error {
  readonly codigo = "RAIZ_INVALIDA";

  constructor(
    mensaje = "Solo una cabecera o una comisaria puede estar sin lugar padre.",
  ) {
    super(mensaje);
    this.name = "RaizInvalidaError";
  }
}

/**
 * `reparentearLugar` rechaza si `puedeContener(nuevoPadre.tipo, hijo.tipo)`
 * es falso (design.md seccion 9): una cabecera no puede colgar de una
 * comisaria, un sector no puede volverse padre de su propia colonia.
 */
export class JerarquiaInvalidaError extends Error {
  readonly codigo = "JERARQUIA_INVALIDA";

  constructor(mensaje = "Ese lugar no puede contener a este.") {
    super(mensaje);
    this.name = "JerarquiaInvalidaError";
  }
}

/**
 * `altaDeCalle` y `renombrarCalle` rechazan si el nombre choca contra
 * `calles_tenant_lugar_nombre_idx` (design.md seccion 9): dos calles
 * pueden compartir nombre en lugares distintos, nunca en el mismo. El
 * indice se dispara tanto en el `INSERT` como en el `UPDATE`, y
 * `repositorioDeCallesSql` traduce los dos (SQLSTATE `23505`, mecanismo
 * documentado ahi). Unico lugar que explica esta regla; el resto del
 * modulo apunta aca en vez de repetirla.
 */
export class NombreDeCalleDuplicadoError extends Error {
  readonly codigo = "NOMBRE_DE_CALLE_DUPLICADO";

  constructor(mensaje = "Ya existe una calle con ese nombre en este lugar.") {
    super(mensaje);
    this.name = "NombreDeCalleDuplicadoError";
  }
}

/**
 * `altaDeDomicilio` rechaza si dos de las tres calles del domicilio
 * coinciden (design.md seccion 4, CHECK `domicilios_calles_distintas`):
 * `domain/direccion.ts` decide, este error solo lo transporta.
 */
export class TransversalRepetidaError extends Error {
  readonly codigo = "TRANSVERSAL_REPETIDA";

  constructor(
    mensaje = "Las calles del domicilio deben ser distintas entre si.",
  ) {
    super(mensaje);
    this.name = "TransversalRepetidaError";
  }
}
