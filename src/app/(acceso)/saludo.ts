/** El saludo segun la hora local (0-23); de noche incluye la madrugada. */
export const saludoDeLaHora = (hora: number): string => {
  if (hora >= 5 && hora <= 11) return "Buenos días";
  if (hora >= 12 && hora <= 18) return "Buenas tardes";

  return "Buenas noches";
};
