const ETIQUETA_DE_ROL: Record<string, string> = {
  ADMIN_MUNICIPAL: "Administrador",
  OPERADOR: "Operador",
  SECRETARIO: "Secretario",
  CONSULTA: "Consulta",
};

export const etiquetaDeRol = (rol: string): string =>
  ETIQUETA_DE_ROL[rol] ?? rol;
