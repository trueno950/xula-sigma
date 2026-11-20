/**
 * La calle elegida en el alta de una intervencion cuelga del asentamiento de
 * otro lugar. `territorio` la descarta al resolver la pareja
 * (`lectorDeUbicacionesSql`), asi que sin este error la operadora leeria "Ese
 * lugar o esa calle no existe en su municipio" sobre dos filas que si existen
 * y si ve en pantalla: el dato incoherente es visible para el tenant, y por
 * eso el mensaje lo dice (S6 de `intervenciones-ux`).
 *
 * Es la misma clase de rechazo que `UbicacionIncoherenteError` en
 * `territorio`, con el vocabulario de esta pantalla: aca lo que se elige es
 * "Lugar" y "Calle".
 */
export class CalleFueraDelLugarError extends Error {
  readonly codigo = "CALLE_FUERA_DEL_LUGAR";

  constructor(
    mensaje = "La calle elegida no es de ese lugar. Elija una calle del lugar, o registre la intervención sin calle.",
  ) {
    super(mensaje);
    this.name = "CalleFueraDelLugarError";
  }
}
