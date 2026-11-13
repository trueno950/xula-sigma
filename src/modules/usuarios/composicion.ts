import { crearAltaDeUsuario, crearListarUsuarios } from "./application";
import { directorioDeUsuariosSql } from "./infrastructure";

/**
 * Raiz de composicion del modulo: une las fabricas de los casos de uso con
 * el adaptador real. Vive fuera de las cuatro capas y es el unico archivo
 * del modulo que ninguna regla de `.dependency-cruiser.cjs` vigila —la
 * contencion es que no tenga nada que vigilar: solo cableado, cero
 * condicionales, cero `await`—, mismo molde que `marca/composicion.ts`.
 *
 * No importa `./ui` ni `./index`: cualquiera de los dos cierra un ciclo
 * (`sin-ciclos`), porque `./ui` importa las Server Actions que a su vez
 * importan este archivo.
 */
export const listarUsuarios = crearListarUsuarios(directorioDeUsuariosSql);
export const altaDeUsuario = crearAltaDeUsuario(directorioDeUsuariosSql);
