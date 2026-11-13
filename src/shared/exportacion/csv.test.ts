import { describe, expect, it } from "vitest";
import { aCsv } from "./csv";

/**
 * Lo que S3 de `exportacion-de-datos` pide: UTF-8 con BOM, coma, comillas y
 * saltos de linea segun RFC 4180, y fechas legibles en hora de Merida. El
 * destinatario abre el archivo con doble clic en Excel; si falta el BOM, los
 * acentos salen como `JosÃ©` y el municipio cree que entregamos basura.
 */
const BOM = "\uFEFF";

describe("aCsv", () => {
  it("empieza con el BOM y usa CRLF entre lineas", () => {
    const csv = aCsv([{ nombre: "Jose", edad: 3 }]);

    expect(csv).toBe(`${BOM}nombre,edad\r\nJose,3\r\n`);
  });

  it("la primera linea es el encabezado con las columnas en el orden en que se vieron", () => {
    const csv = aCsv([
      { a: 1, b: 2 },
      { c: 3, b: 4 },
    ]);

    expect(csv).toBe(`${BOM}a,b,c\r\n1,2,\r\n,4,3\r\n`);
  });

  it("una lista de columnas explicita manda y deja afuera las claves que no nombra", () => {
    const csv = aCsv([{ a: 1, b: 2 }], ["b"]);

    expect(csv).toBe(`${BOM}b\r\n2\r\n`);
  });

  it("un conjunto vacio sin columnas es solo el BOM", () => {
    expect(aCsv([])).toBe(BOM);
  });

  it("un conjunto vacio con columnas conserva el encabezado", () => {
    expect(aCsv([], ["a", "b"])).toBe(`${BOM}a,b\r\n`);
  });

  it("entrecomilla el campo con coma y lo deja intacto", () => {
    expect(aCsv([{ direccion: "Calle 20, por 15" }])).toBe(
      `${BOM}direccion\r\n"Calle 20, por 15"\r\n`,
    );
  });

  it("duplica las comillas adentro del campo y lo entrecomilla", () => {
    expect(aCsv([{ nota: 'dijo "hola"' }])).toBe(
      `${BOM}nota\r\n"dijo ""hola"""\r\n`,
    );
  });

  it("entrecomilla el campo con salto de linea y con retorno de carro", () => {
    expect(aCsv([{ nota: "una\nlinea" }])).toBe(
      `${BOM}nota\r\n"una\nlinea"\r\n`,
    );
    expect(aCsv([{ nota: "una\rlinea" }])).toBe(
      `${BOM}nota\r\n"una\rlinea"\r\n`,
    );
  });

  it("un campo sin comas ni comillas no se entrecomilla", () => {
    expect(aCsv([{ nota: "texto simple" }])).toBe(
      `${BOM}nota\r\ntexto simple\r\n`,
    );
  });

  it("null y undefined dejan el campo vacio", () => {
    expect(aCsv([{ a: null, b: undefined, c: 0 }])).toBe(
      `${BOM}a,b,c\r\n,,0\r\n`,
    );
  });

  it("las fechas salen como fecha y hora de Merida, cruzando la medianoche UTC", () => {
    const csv = aCsv([{ emitidaEn: new Date("2026-11-14T00:05:00.000Z") }]);

    expect(csv).toBe(`${BOM}emitidaEn\r\n2026-11-13 18:05\r\n`);
  });

  it("una fecha cuya fecha civil de Merida es la del dia anterior no se corre de dia", () => {
    const csv = aCsv([{ ocurridoEn: new Date("2026-11-14T02:05:00.000Z") }]);

    expect(csv).toBe(`${BOM}ocurridoEn\r\n2026-11-13 20:05\r\n`);
  });

  it("los booleanos salen como true y false, no como 1 y 0", () => {
    expect(aCsv([{ activo: true, baja: false }])).toBe(
      `${BOM}activo,baja\r\ntrue,false\r\n`,
    );
  });

  it("los numeros salen tal cual, con signo y decimales", () => {
    expect(aCsv([{ latitud: 20.9674, longitud: -89.6237 }])).toBe(
      `${BOM}latitud,longitud\r\n20.9674,-89.6237\r\n`,
    );
  });

  it("un objeto se escribe como JSON, entrecomillado por las comillas que trae", () => {
    expect(aCsv([{ marca: { color: "#123456" } }])).toBe(
      `${BOM}marca\r\n"{""color"":""#123456""}"\r\n`,
    );
  });

  it("una lista se escribe como JSON y se entrecomilla por las comas", () => {
    expect(aCsv([{ folios: [1, 2] }])).toBe(`${BOM}folios\r\n"[1,2]"\r\n`);
  });

  it("el encabezado tambien se escapa", () => {
    expect(aCsv([], ["nombre,completo"])).toBe(`${BOM}"nombre,completo"\r\n`);
  });
});
