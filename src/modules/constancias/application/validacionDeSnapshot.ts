import { z } from "zod";

/**
 * El snapshot congelado que `emitirConstancia` guarda en `constancias.datos`
 * (design.md de `constancias-oficios`, seccion 5). Se valida con Zod al
 * componerlo y al leerlo -mismo criterio que `validacionDeDocumentos.ts` y
 * el precedente `shared/marca/validacion.ts`-, aunque quien lo compone es
 * siempre este mismo modulo: no hay entrada de usuario que pase por aca.
 */
export const esquemaDeSnapshot = z.object({
  titular: z.object({ nombreCompleto: z.string().min(1).max(300) }),
  direccion: z.object({
    texto: z.string().min(1).max(600),
    // Traza opaca de que residencia lo origino (proposal.md decision 17).
    // NUNCA se dereferencia: no hay lectura en este cambio que la use para
    // volver a la fila.
    residenciaId: z.string(),
    desdeEn: z.string(), // fecha civil "YYYY-MM-DD"
  }),
  firmante: z.object({
    nombre: z.string().min(1).max(120),
    cargo: z.string().min(1).max(120),
  }),
  leyendaDePie: z.string().max(300).optional(),
});

export type Snapshot = z.infer<typeof esquemaDeSnapshot>;
