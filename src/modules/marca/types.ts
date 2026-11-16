/** Lo que trae la subida de un escudo: los bytes crudos del archivo. */
export type EntradaDeEscudo = {
  bytes: Uint8Array;
};

/**
 * Lo que elige el municipio en `/marca`. Sin `primarioTexto`: ese lo decide
 * el servidor (S2), y por eso no hay campo que el cliente pueda escribir.
 */
export type EntradaDeColores = {
  primario: string;
  secundario: string;
};

/** Los colores que quedaron guardados, con el texto ya resuelto. */
export type ColoresCambiados = EntradaDeColores & {
  primarioTexto: string;
};

/** Lo que devuelve `cambiarEscudo` cuando la subida se completa. */
export type EscudoCambiado = {
  /** La URL nueva, ya guardada en `ayuntamientos.marca`. */
  escudo: string;
};
