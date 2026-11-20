import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * S9 de `intervenciones-ux`: el aviso «No anote nombres…» vive en un solo
 * lugar. Estaba copiado en el alta, la corrección y programar obra, y un
 * archivo de texto repetido en tres no tiene CI: el día que la redacción
 * cambie, dos se quedan viejas.
 */
const AVISO = "No anote nombres, teléfonos ni datos de vecinos.";
const RAIZ = "src/modules/intervenciones";

const archivosDelModulo = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name);

    if (entrada.isDirectory()) return archivosDelModulo(ruta);

    return /\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name)
      ? [ruta]
      : [];
  });

describe("el aviso de datos personales", () => {
  it("está escrito en un solo archivo del módulo", () => {
    const conElAviso = archivosDelModulo(RAIZ).filter((ruta) =>
      readFileSync(ruta, "utf8").includes(AVISO),
    );

    expect(conElAviso).toEqual([
      "src/modules/intervenciones/ui/avisoDePrivacidad.tsx",
    ]);
  });
});
