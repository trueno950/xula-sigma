/**
 * Los dos recursos que el mapa dibuja. Vive en su propio modulo porque lo
 * necesitan tanto el hecho como su leyenda, y ponerlo en cualquiera de los
 * dos creaba un ciclo de imports entre ellos.
 */
export type RecursoDeMapa = "REPORTE" | "INTERVENCION";
