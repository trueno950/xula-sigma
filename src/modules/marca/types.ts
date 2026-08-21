/** Lo que trae la subida de un escudo: los bytes crudos del archivo. */
export type EntradaDeEscudo = {
  bytes: Uint8Array;
};

/** Lo que devuelve `cambiarEscudo` cuando la subida se completa. */
export type EscudoCambiado = {
  /** La URL nueva, ya guardada en `ayuntamientos.marca`. */
  escudo: string;
};
