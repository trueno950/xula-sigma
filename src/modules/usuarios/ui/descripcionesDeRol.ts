import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";

/**
 * Lo que el listado dice de cada rol (S4 de `usuarios-ux`): el titulo del
 * grupo, el orden en que los grupos se suceden y que permite el rol.
 *
 * La pregunta que trae quien administra cuentas es «quien puede capturar»,
 * y hoy hay que adivinarla leyendo una columna de rol fila por fila. El
 * texto vive aca, una sola vez: lo que decide por el rol —permisos, casos de
 * uso— no esta en esta capa.
 */

/** Los tres roles del municipio, en el orden en que el listado los agrupa. */
export const ROLES_DEL_MUNICIPIO = [
  "ADMIN_MUNICIPAL",
  "OPERADOR",
  "CONSULTA",
] as const;

const TITULOS: Record<string, string> = {
  ADMIN_MUNICIPAL: "Administrador municipal",
  OPERADOR: "Operador",
  CONSULTA: "Consulta",
};

const PERMISOS: Record<string, string> = {
  ADMIN_MUNICIPAL:
    "Todo el panel, más usuarios y marca. No hay dos administradores por ayuntamiento.",
  OPERADOR:
    "Captura en padrón, reportes, constancias y territorio. No administra cuentas ni cambia la marca.",
  CONSULTA:
    "Solo lectura: busca en el padrón y en los reportes, no escribe ni administra.",
};

/**
 * Un rol fuera de los tres del municipio existe: el ayuntamiento reservado
 * de plataforma tiene su `SUPER_ADMIN`, que este listado muestra y no
 * administra. No se esconde —una cuenta que entra al panel y no aparece es
 * peor que una que aparece con su razon— ni se le inventa un permiso.
 */
const CUENTA_DE_PLATAFORMA =
  "Cuenta de plataforma: no pertenece a los roles del municipio y no se administra desde aquí.";

export const tituloDelRol = (rol: string): string =>
  TITULOS[rol] ?? etiquetaDeRol(rol);

export const permisosDelRol = (rol: string): string =>
  PERMISOS[rol] ?? CUENTA_DE_PLATAFORMA;
