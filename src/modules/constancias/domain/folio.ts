/**
 * Value object del folio impreso. `padStart(6, "0")` sin recorte: el
 * consecutivo puede superar seis digitos y el folio sigue siendo unico
 * -lo protege `constancias_serie_idx`, no el ancho del texto (design.md
 * seccion 6)-.
 */
export class Folio {
  private constructor(private readonly valor: string) {}

  static crear(prefijo: string, anio: number, consecutivo: number): Folio {
    if (!Number.isInteger(consecutivo) || consecutivo < 1) {
      throw new Error(
        `Consecutivo invalido: se esperaba un entero mayor o igual a 1, se recibio ${consecutivo}.`,
      );
    }

    return new Folio(
      `${prefijo}-${anio}-${String(consecutivo).padStart(6, "0")}`,
    );
  }

  toString(): string {
    return this.valor;
  }
}
