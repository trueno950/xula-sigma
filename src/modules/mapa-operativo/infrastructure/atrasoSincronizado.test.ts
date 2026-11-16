import { describe, expect, it } from "vitest";
import { diasDeAtraso as diasDelDueno } from "@/modules/reportes";
import { diasDeAtrasoEnElMapa } from "../domain/atraso";

/**
 * El mapa guarda su propia copia de la regla de atraso
 * (`domain/atraso.ts`) porque un modulo no importa el dominio de otro. Este
 * es el unico lugar donde se compara con su duena: si `reportes` cambia el
 * criterio -la frontera inclusiva, que solo `RECIBIDO` cuente, el rango del
 * umbral-, este test falla en vez de dejar dos lecturas del mismo dato.
 */
const CASOS = [
  {
    estado: "RECIBIDO",
    fechaDeRegistro: "2026-11-01",
    hoy: "2026-11-08",
    umbral: 7,
  },
  {
    estado: "RECIBIDO",
    fechaDeRegistro: "2026-11-02",
    hoy: "2026-11-08",
    umbral: 7,
  },
  {
    estado: "RECIBIDO",
    fechaDeRegistro: "2026-01-01",
    hoy: "2026-11-08",
    umbral: 7,
  },
  {
    estado: "RECIBIDO",
    fechaDeRegistro: "2026-11-07",
    hoy: "2026-11-08",
    umbral: 1,
  },
  {
    estado: "RECIBIDO",
    fechaDeRegistro: "2026-08-10",
    hoy: "2026-11-08",
    umbral: 90,
  },
  {
    estado: "RECIBIDO",
    fechaDeRegistro: "2026-08-11",
    hoy: "2026-11-08",
    umbral: 90,
  },
  {
    estado: "RECIBIDO",
    fechaDeRegistro: "2026-11-09",
    hoy: "2026-11-08",
    umbral: 7,
  },
  { estado: "RECIBIDO", fechaDeRegistro: "ayer", hoy: "2026-11-08", umbral: 7 },
  {
    estado: "EN_ATENCION",
    fechaDeRegistro: "2026-01-01",
    hoy: "2026-11-08",
    umbral: 7,
  },
  {
    estado: "RESUELTO",
    fechaDeRegistro: "2026-01-01",
    hoy: "2026-11-08",
    umbral: 7,
  },
  {
    estado: "RECHAZADO",
    fechaDeRegistro: "2026-01-01",
    hoy: "2026-11-08",
    umbral: 7,
  },
] as const;

describe("la regla de atraso del mapa frente a su duena en reportes", () => {
  it.each(CASOS)("el caso %# da el mismo veredicto que `reportes`", (caso) => {
    expect(diasDeAtrasoEnElMapa(caso)).toBe(diasDelDueno(caso));
  });
});
