import { LugarConDependientesError } from "./errores";

/**
 * `reparentearLugar` rechaza mover a otro asentamiento un lugar con
 * domicilios activos en su subarbol: cada domicilio guarda calles del
 * asentamiento de origen, y la constancia imprimiria una calle que no
 * existe en el de destino. `reparentearCalle` cierra el mismo caso del lado
 * de la calle con `CalleConDomiciliosError`.
 */
export class LugarConDomiciliosError extends Error {
  readonly codigo = "LUGAR_CON_DOMICILIOS";

  constructor(
    mensaje = "El lugar tiene domicilios y no se puede mover a otro asentamiento. Dé de baja o corrija primero sus domicilios.",
  ) {
    super(mensaje);
    this.name = "LugarConDomiciliosError";
  }
}

/**
 * Las calles y las zonas cuelgan del asentamiento por `lugarId`, igual que
 * los hijos: la baja logica no las ve como un FK. Son subclases para que
 * quien ya traduce `LugarConDependientesError` muestre su mensaje propio.
 */
export class LugarConCallesError extends LugarConDependientesError {
  constructor(
    mensaje = "El lugar tiene calles activas. Dé de baja o mueva primero sus calles.",
  ) {
    super(mensaje);
    this.name = "LugarConCallesError";
  }
}

export class LugarConZonasError extends LugarConDependientesError {
  constructor(
    mensaje = "El lugar tiene zonas activas. Dé de baja primero sus zonas.",
  ) {
    super(mensaje);
    this.name = "LugarConZonasError";
  }
}
