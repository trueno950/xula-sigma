import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { metadata as metadataRaiz } from "./layout";

/**
 * El titulo de cada pantalla, por ruta. Es la unica lista: una pantalla
 * nueva sin entrada aqui falla el test, en vez de heredar en silencio el
 * titulo generico de la plataforma.
 *
 * Son titulos de ruta y no de registro, a proposito: un titulo termina en el
 * historial del navegador, en marcadores y en pestanas compartidas, y un
 * nombre, una CURP o un folio de persona ahi es dato personal fuera de
 * cualquier RLS (`AGENTS.md`, Datos personales).
 */
const TITULOS: Record<string, string> = {
  "(acceso)/acceso/page.tsx": "Acceso",
  "(acceso)/page.tsx": "Inicio",
  "(panel)/calles/[id]/historial/page.tsx": "Historial de calle",
  "(panel)/constancias/[id]/page.tsx": "Constancia",
  "(panel)/constancias/configuracion/page.tsx": "Configuración de constancias",
  "(panel)/constancias/emitir/page.tsx": "Emitir constancia",
  "(panel)/constancias/page.tsx": "Constancias",
  "(panel)/intervenciones/[id]/page.tsx": "Intervención",
  "(panel)/intervenciones/page.tsx": "Intervenciones",
  "(panel)/mapa-operativo/page.tsx": "Mapa operativo",
  "(panel)/marca/page.tsx": "Marca",
  "(panel)/padron/[id]/page.tsx": "Persona",
  "(panel)/padron/alta/page.tsx": "Alta de persona",
  "(panel)/padron/(lista)/page.tsx": "Padrón",
  "(panel)/reportes/alta/page.tsx": "Nuevo reporte",
  "(panel)/reportes/detalle/[id]/page.tsx": "Detalle de reporte",
  "(panel)/reportes/page.tsx": "Reportes",
  "(panel)/territorio/domicilios/page.tsx": "Domicilios",
  "(panel)/territorio/page.tsx": "Territorio",
  "reportes/[folio]/page.tsx": "Seguimiento de reporte",
  "validar/[folio]/page.tsx": "Validar constancia",
};

const RAIZ = resolve(import.meta.dirname);
const paginas = globSync("**/page.tsx", { cwd: RAIZ }).sort();

const tituloDe = (pagina: string) =>
  /export const metadata(?:: Metadata)? = \{\s*title: "([^"]*)"/.exec(
    readFileSync(resolve(RAIZ, pagina), "utf8"),
  )?.[1];

describe("titulos de pagina", () => {
  it("cada pantalla tiene su titulo declarado en la lista", () => {
    expect(paginas).toEqual(Object.keys(TITULOS).sort());
  });

  it.each(paginas)("%s declara un titulo estatico de ruta", (pagina) => {
    expect(tituloDe(pagina)).toBe(TITULOS[pagina]);
  });

  it("el titulo de la plataforma es plantilla: nombre de pantalla y plataforma", () => {
    expect(metadataRaiz.title).toEqual({
      default: "XULA SIGMA",
      template: "%s · XULA SIGMA",
    });
  });
});
