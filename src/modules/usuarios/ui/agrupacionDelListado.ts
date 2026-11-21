import type { UsuarioDelPanel } from "../domain";
import { ROLES_DEL_MUNICIPIO } from "./descripcionesDeRol";

/**
 * El orden del listado (S4 de `usuarios-ux`), en una funcion pura: las
 * activas por rol —administrador, operador, consulta— y dentro de cada rol
 * por nombre, que es el orden en que llegan; las de baja al final, aparte,
 * de la mas reciente a la mas antigua (S5).
 *
 * Vive en `ui` y no en la consulta SQL porque es una decision de pantalla:
 * el adaptador ordena para que la lista se lea, y esto decide que se agrupa
 * y que se cuenta. El nombre dentro del grupo lo pone el `orderBy` del
 * adaptador, que ya ordena por `name`.
 */

export type GrupoDelListado = {
  rol: string;
  cuentas: readonly UsuarioDelPanel[];
};

export type ListadoAgrupado = {
  /** Solo roles con cuentas activas, en el orden de `ROLES_DEL_MUNICIPIO`. */
  grupos: readonly GrupoDelListado[];
  /** Las de baja, de la mas reciente a la mas antigua. */
  bajas: readonly UsuarioDelPanel[];
  total: number;
  activas: number;
  deBaja: number;
};

const masRecientePrimero = (a: UsuarioDelPanel, b: UsuarioDelPanel): number =>
  (b.bajaEn?.getTime() ?? 0) - (a.bajaEn?.getTime() ?? 0);

/**
 * Los roles que no son del municipio, en el orden en que aparecen. Van
 * despues de los tres y cada uno con su grupo: una cuenta activa que no se
 * pinta desaparece del unico listado que la muestra.
 */
const rolesDesconocidos = (
  activas: readonly UsuarioDelPanel[],
): readonly string[] => {
  const delMunicipio: readonly string[] = ROLES_DEL_MUNICIPIO;
  const otros = activas
    .map((cuenta) => cuenta.rol)
    .filter((rol) => !delMunicipio.includes(rol));

  return [...new Set(otros)];
};

export const agruparListado = (
  usuarios: readonly UsuarioDelPanel[],
): ListadoAgrupado => {
  const activas = usuarios.filter((cuenta) => !cuenta.dadoDeBaja);
  const bajas = usuarios
    .filter((cuenta) => cuenta.dadoDeBaja)
    .sort(masRecientePrimero);
  const roles = [...ROLES_DEL_MUNICIPIO, ...rolesDesconocidos(activas)];

  const grupos = roles
    .map((rol) => ({
      rol,
      cuentas: activas.filter((cuenta) => cuenta.rol === rol),
    }))
    .filter((grupo) => grupo.cuentas.length > 0);

  return {
    grupos,
    bajas,
    total: usuarios.length,
    activas: activas.length,
    deBaja: bajas.length,
  };
};
