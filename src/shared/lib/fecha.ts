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

const formateadorDeFechaYHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Merida",
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Fecha y hora legibles de un instante ya guardado, en `America/Merida` -no
 * "ahora": esto formatea un `Date` que llega por parametro, como
 * `constancias.emitidaEn`. `toLocaleString` sin `timeZone` usa la del
 * proceso (UTC en el servidor), el mismo bug que `hoyEnMerida` y
 * `anioEnMerida` evitan para la fecha civil de hoy.
 */
export const fechaYHoraEnMerida = (fecha: Date): string =>
  formateadorDeFechaYHora.format(fecha);

const formateadorDeFecha = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Merida",
  dateStyle: "medium",
});

export const fechaEnMerida = (fecha: Date): string =>
  formateadorDeFecha.format(fecha);

const formateadorDeFechaCivil = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  dateStyle: "medium",
});

/**
 * Formatea una fecha civil (`YYYY-MM-DD`) que el sistema carga como
 * medianoche UTC de ese dia, como `fecha_de_ocurrencia` de las
 * intervenciones. Aqui el `timeZone` es `UTC` a proposito y no `Merida`: esa
 * medianoche ya ES el dia civil, y en Merida (UTC-6) caeria a las 18:00 del
 * dia anterior. No sirve para un instante real: para eso, `fechaEnMerida`.
 */
export const fechaCivilDeMedianocheUtc = (fecha: Date): string =>
  formateadorDeFechaCivil.format(fecha);

const formateadorDeFechaCivilLarga = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formateadorDeFechaCivilCorta = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Los snapshots guardados aceptan cualquier texto en `desdeEn`
// (`validacionDeSnapshot.ts` usa `z.string()`); un valor antiguo no debe
// impedir emitir.
const fechaCivilComoDate = (fecha: string): Date | null => {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!coincidencia) return null;

  const [, anioTexto, mesTexto, diaTexto] = coincidencia;
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  if (anio < 1) return null;

  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fechaUtc.getUTCFullYear() !== anio ||
    fechaUtc.getUTCMonth() !== mes - 1 ||
    fechaUtc.getUTCDate() !== dia
  ) {
    return null;
  }

  return fechaUtc;
};

export const fechaCivilLarga = (fecha: string): string => {
  const fechaUtc = fechaCivilComoDate(fecha);
  return fechaUtc ? formateadorDeFechaCivilLarga.format(fechaUtc) : fecha;
};

export const fechaCivilCorta = (fecha: string): string => {
  const fechaUtc = fechaCivilComoDate(fecha);
  return fechaUtc ? formateadorDeFechaCivilCorta.format(fechaUtc) : fecha;
};

const formateadorDeHora = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Merida",
  hour: "numeric",
  hourCycle: "h23",
});

/**
 * Hora (0-23) de un instante en `America/Merida`. `getHours()` usaria la
 * zona del proceso (UTC en el servidor). `hourCycle: "h23"` evita el "24"
 * que algunos motores devuelven a medianoche con `hour12: false`.
 */
export const horaEnMerida = (instante: Date): number =>
  Number(formateadorDeHora.format(instante));
