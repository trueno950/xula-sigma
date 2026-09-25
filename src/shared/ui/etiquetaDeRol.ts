const ETIQUETA_DE_ROL: Record<string, string> = {
  ADMIN_MUNICIPAL: "Administrador",
  OPERADOR: "Operador",
  SECRETARIO: "Secretario",
  CONSULTA: "Consulta",
};

/**
 * El rol como se lo dice a una persona. Un rol sin etiqueta se muestra tal
 * cual: es mejor un identificador crudo que esconder quien esta dentro.
 */
export const etiquetaDeRol = (rol: string): string =>
  ETIQUETA_DE_ROL[rol] ?? rol;
