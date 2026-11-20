/**
 * Lo que comparten las dos pruebas de `altaDeIntervencionAction`: el POST ya
 * armado, la sesión y la lectura del redirect. Vive aparte de ellas por la
 * métrica de 200 líneas de `AGENTS.md`; el corte cae por tema, como el de
 * `territorio/parametros.ts`.
 */
export const ID = "33333333-3333-4333-8333-333333333333";
export const LUGAR = "22222222-2222-4222-8222-222222222222";
export const CALLE = "44444444-4444-4444-8444-444444444444";

export const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR" | "CONSULTA") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

export const formDataDe = (campos: Record<string, string> = {}) => {
  const formData = new FormData();
  const base: Record<string, string> = {
    tipo: "PAVIMENTACION",
    fechaDeOcurrencia: "2026-11-16",
    lugarId: LUGAR,
    calleId: CALLE,
    descripcion: "Pavimentacion de la calle 20 entre 15 y 17",
    ...campos,
  };
  for (const [clave, valor] of Object.entries(base)) {
    formData.set(clave, valor);
  }
  return formData;
};

/** La URL del primer redirect, ya decodificada. */
export const redireccionDe = (redirect: {
  mock: { calls: unknown[][] };
}): string => decodeURIComponent(redirect.mock.calls[0]?.[0] as string);

/** El token del borrador guardado: lo unico de lo capturado que va en la URL. */
export const tokenGuardadoDe = (guardar: {
  mock: { calls: unknown[][] };
}): unknown =>
  (guardar.mock.calls[0]?.[0] as { token?: unknown } | undefined)?.token;
