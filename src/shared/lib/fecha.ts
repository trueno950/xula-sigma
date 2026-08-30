const formateador = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Merida",
});

/**
 * Fecha civil de hoy en `America/Merida`, `"YYYY-MM-DD"`. `en-CA` es el
 * locale que `Intl.DateTimeFormat` formatea en ese orden sin necesitar
 * reordenar las partes a mano.
 */
export const hoyEnMerida = (): string => formateador.format(new Date());

const formateadorDeAnio = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Merida",
  year: "numeric",
});

/**
 * Anio civil de hoy en `America/Merida`. Mismo mecanismo que `hoyEnMerida`
 * y el mismo bug que evita: el contador de folios (design.md de
 * `constancias-oficios`, seccion 4) corta la serie por anio, y
 * `new Date().getUTCFullYear()` da el anio equivocado durante las horas en
 * que Merida (UTC-6) todavia esta en el anio anterior al de UTC.
 */
export const anioEnMerida = (): number =>
  Number(formateadorDeAnio.format(new Date()));
