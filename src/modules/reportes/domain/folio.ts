/**
 * Value object del folio impreso. El prefijo no es parametro -a diferencia
 * de `constancias/domain/folio.ts`-: hay una sola serie (design.md seccion
 * 4). `padStart(6, "0")` sin recorte: el consecutivo puede superar seis
 * digitos y el folio sigue siendo unico -lo protege `reportes_serie_idx`,
 * no el ancho del texto-.
 */
export const PREFIJO_DE_REPORTE = "REP";

/**
 * Misma forma que `Folio.crear`: `padStart(6, "0")` sin recorte, asi que el
 * consecutivo puede tener mas de seis digitos.
 */
const FORMATO_DE_FOLIO = new RegExp(`^${PREFIJO_DE_REPORTE}-\\d{4}-\\d{6,}$`);

export const esFolioDeReporte = (texto: string): boolean =>
  FORMATO_DE_FOLIO.test(texto);

/** Lo que el operador teclea a mano: sin espacios de mas y sin importar mayusculas. */
export const normalizarFolio = (texto: string): string =>
  texto.trim().toUpperCase();

export class Folio {
  private constructor(private readonly valor: string) {}

  static crear(anio: number, consecutivo: number): Folio {
    if (!Number.isInteger(consecutivo) || consecutivo < 1) {
      throw new Error(
        `Consecutivo invalido: se esperaba un entero mayor o igual a 1, se recibio ${consecutivo}.`,
      );
    }

    return new Folio(
      `${PREFIJO_DE_REPORTE}-${anio}-${String(consecutivo).padStart(6, "0")}`,
    );
  }

  toString(): string {
    return this.valor;
  }
}
