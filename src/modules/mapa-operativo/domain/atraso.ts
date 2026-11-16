/**
 * La regla de atraso de S1 de `gestion-municipal`, vista desde el mapa.
 *
 * Es una copia local de la de `reportes/domain/umbralDeAtraso.ts` -un modulo
 * no importa el dominio de otro (`AGENTS.md`, antipatron 8)-, igual que
 * `vocabularios.ts` lo es de sus catalogos: `infrastructure/
 * atrasoSincronizado.test.ts` la compara con su duena, asi que un cambio de
 * criterio alla rompe un test aca en vez de dejar dos lecturas del mismo
 * dato.
 *
 * Las fechas son civiles (`YYYY-MM-DD` en `America/Merida`): el atraso se
 * cuenta en dias de calendario, y quien convierte el instante de registro es
 * el adaptador del mapa, con `shared/lib/fecha`.
 */
export const diasDeAtrasoEnElMapa = (opciones: {
  estado: string;
  fechaDeRegistro: string;
  hoy: string;
  umbral: number;
}): number | null => {
  if (opciones.estado !== "RECIBIDO") return null;

  const inicio = Date.parse(`${opciones.fechaDeRegistro}T00:00:00Z`);
  const fin = Date.parse(`${opciones.hoy}T00:00:00Z`);

  if (Number.isNaN(inicio) || Number.isNaN(fin)) return null;

  const dias = Math.round((fin - inicio) / 86_400_000);

  return dias < opciones.umbral ? null : dias;
};
