import { describe, expect, it } from "vitest";
import { metricas } from "../index";
import { archivo, hallazgosDeMetrica } from "../pruebas";

const deNLineas = (n: number) => Array(n).fill("x").join("\n");

describe("el catalogo de metricas", () => {
  it("no repite identificadores", () => {
    const ids = metricas.map((metrica) => metrica.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("metrica-archivo-200", () => {
  const id = "metrica-archivo-200";

  it("marca el archivo de mas de 200 lineas", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo("src/modules/reportes/domain/x.ts", deNLineas(201)),
      ]),
    ).toHaveLength(1);
  });

  it("no marca el archivo de exactamente 200 lineas", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo("src/modules/reportes/domain/x.ts", deNLineas(200)),
      ]),
    ).toEqual([]);
  });

  it("no marca la deuda listada, para no romper el build", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo("src/shared/auth/roles.test.ts", deNLineas(201)),
      ]),
    ).toEqual([]);
  });

  it("no marca los scripts, que no son codigo de aplicacion", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo("scripts/reglas/main.ts", deNLineas(201)),
      ]),
    ).toEqual([]);
  });
});

describe("metrica-params-3", () => {
  const id = "metrica-params-3";

  it("marca la funcion con cuatro parametros simples", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo(
          "src/modules/reportes/application/x.ts",
          "const f = async (a: string, b: number, c: boolean, d: Date) => {};\n",
        ),
      ]),
    ).toHaveLength(1);
  });

  it("marca la declaracion `function` con cuatro parametros", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo(
          "src/modules/reportes/application/x.ts",
          "function f(a, b, c, d) {}\n",
        ),
      ]),
    ).toHaveLength(1);
  });

  it("no marca la funcion de tres parametros", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo(
          "src/modules/reportes/application/x.ts",
          "const f = (a: string, b: number, c: boolean) => {};\n",
        ),
      ]),
    ).toEqual([]);
  });

  it("no marca la desestructuracion de cuatro campos como cuatro parametros", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo(
          "src/modules/reportes/application/x.ts",
          "const f = ({ a, b, c, d }) => {};\n",
        ),
      ]),
    ).toEqual([]);
  });

  it("no marca la coma colgante como un parametro de mas", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo(
          "src/modules/reportes/application/x.ts",
          "const f = (\n  a: string,\n  b: number,\n  c: boolean,\n) => {};\n",
        ),
      ]),
    ).toEqual([]);
  });

  it("no marca una lista ambigua con genericos", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo(
          "src/modules/reportes/application/x.ts",
          "const f = (a: Map<string, number>, b: string, c: number, d: Date) => {};\n",
        ),
      ]),
    ).toEqual([]);
  });

  it("no confunde una llamada de cuatro argumentos con una firma", () => {
    expect(
      hallazgosDeMetrica(id, [
        archivo(
          "src/modules/reportes/application/x.ts",
          "calcularTotal(a, b, c, d); const otra = (x) => x;\n",
        ),
      ]),
    ).toEqual([]);
  });
});
