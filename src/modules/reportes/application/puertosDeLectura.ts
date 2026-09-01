/**
 * Lo que `registrarReporte` necesita leer de otros modulos, sin armar la
 * lectura a mano (antipatron 8 de `AGENTS.md`: otro modulo es el mundo
 * exterior y se cruza por un puerto propio).
 *
 * Las dos lecturas **no** reciben `tx`: se llaman antes de abrir el
 * `withTenant` de `registrarReporte` (design.md seccion 11), y el adaptador
 * real abre su propio `withTenant` -el de `territorio` o el de `padron`- por
 * dentro. Es el calco de `LecturaDeTitulares`/`LecturaDeDirecciones` de
 * `constancias`, y la ausencia de `tx` en la firma es lo que lo marca.
 */

/** Sin `tx`: abre el `withTenant` de `territorio` (design.md seccion 11). */
export type LecturaDeUbicaciones = {
  de(
    lugarId: string,
    calleId: string | null,
  ): Promise<{ texto: string } | null>;
};

/** Sin `tx`: abre el `withTenant` de `padron`. Calco de `LecturaDeTitulares`. */
export type LecturaDeReportantes = {
  porId(
    personaId: string,
  ): Promise<{ nombreCompleto: string; bajaEn: Date | null } | null>;
};
