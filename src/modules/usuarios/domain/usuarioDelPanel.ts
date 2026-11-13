/**
 * La fila del listado de usuarios (S2): lo que la pantalla necesita mostrar,
 * ni una columna mas.
 *
 * **`rol` es texto y no la union de `shared/auth/roles.ts`.** `domain` no
 * importa `shared` —lo hace cumplir `.dependency-cruiser.cjs`— y repetir
 * `ROLES` aca seria una segunda fuente de verdad de los cuatro roles, que es
 * peor que un tipo abierto: el dia que entre un rol nuevo, la copia vieja no
 * falla. Nada de esta capa decide por el rol; quien decide es
 * `puedeAdministrarUsuarios`, en el caso de uso.
 *
 * Tampoco lleva el correo del actor, ni el hash de la credencial: el hash
 * vive en `cuentas` y no se lee desde ningun listado.
 */
export type UsuarioDelPanel = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  /** La baja es logica: la fila sigue y se muestra, marcada (S6). */
  dadoDeBaja: boolean;
};
