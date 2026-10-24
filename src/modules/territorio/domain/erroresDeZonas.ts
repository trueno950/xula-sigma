/**
 * Errores de zonas, separados de `errores.ts` porque ese archivo llego a su
 * metrica de 200 lineas con los errores de calles y domicilios, y los de
 * zonas entraron despues (B3u). La particion es por tema, no arbitraria:
 * todo lo que una Server Action de zonas tiene que redactar vive aca.
 */

export class NombreDeZonaDuplicadoError extends Error {
  readonly codigo = "NOMBRE_DE_ZONA_DUPLICADO";

  constructor(
    mensaje = "Ya existe una zona activa con ese nombre en el asentamiento.",
  ) {
    super(mensaje);
    this.name = "NombreDeZonaDuplicadoError";
  }
}

export class CalleFueraDelAsentamientoError extends Error {
  readonly codigo = "CALLE_FUERA_DEL_ASENTAMIENTO";

  constructor(mensaje = "La calle no pertenece al asentamiento de la zona.") {
    super(mensaje);
    this.name = "CalleFueraDelAsentamientoError";
  }
}
