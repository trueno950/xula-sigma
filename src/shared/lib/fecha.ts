const formateador = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Merida",
});

/**
 * Fecha civil de hoy en `America/Merida`, `"YYYY-MM-DD"`. `en-CA` es el
 * locale que `Intl.DateTimeFormat` formatea en ese orden sin necesitar
 * reordenar las partes a mano.
 */
export const hoyEnMerida = (): string => formateador.format(new Date());
