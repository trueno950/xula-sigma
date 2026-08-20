/**
 * Lo que el caso de uso necesita del almacen de assets. `guardar` devuelve
 * la URL, no la clave: armarla es conocimiento de infraestructura, sabe el
 * dominio publico. `borrar` recibe la URL guardada y no la clave, por
 * simetria — el adaptador es el unico que sabe mapear en las dos
 * direcciones.
 */
export type AlmacenDeAssets = {
  /** Devuelve la URL publica absoluta del objeto guardado. */
  guardar(clave: string, bytes: Uint8Array): Promise<string>;
  /**
   * Recibe la URL guardada, no la clave. No-opera si la URL no es de este
   * almacen: es una regla de seguridad, no una comodidad. `marca.escudo`
   * puede llevar cualquier URL http pegada a mano, y un borrado que
   * confiara en el prefijo intentaria un DELETE derivado de una cadena que
   * escribio otro.
   */
  borrar(url: string): Promise<void>;
};
