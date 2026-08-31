/**
 * Value object del folio impreso. El prefijo no es parametro -a diferencia
 * de `constancias/domain/folio.ts`-: hay una sola serie (design.md seccion
 * 4). `padStart(6, "0")` sin recorte: el consecutivo puede superar seis
 * digitos y el folio sigue siendo unico -lo protege `reportes_serie_idx`,
 * no el ancho del texto-.
 */
export const PREFIJO_DE_REPORTE = "REP";

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
