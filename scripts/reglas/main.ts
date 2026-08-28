import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { type Archivo, type Hallazgo, reglas, revisar } from "./reglas";

/**
 * Revisa el repositorio ENTERO, no el diff.
 *
 * Es la ventaja concreta sobre el revisor de IA: leer 8 reglas sobre todos
 * los archivos rastreados tarda milisegundos y cuesta cero, asi que no hay
 * ninguna razon para acotar el alcance. Acotarlo, ademas, reintroduce el
 * defecto que ya se pago dos veces en este proyecto: `--pr-mode` sobre una
 * rama sin commits por delante de main no revisa una linea y sale en verde.
 * Sin rango que calcular, ese modo de falla no existe.
 */

const EXTENSIONES = /\.(tsx?|sql)$/;

/**
 * El corpus de prueba del propio verificador.
 *
 * `reglas.test.ts` tiene que contener, literales, las violaciones que las
 * reglas buscan: un `SET app.tenant` sin `LOCAL`, una cita a `sign-up.mjs`
 * sin version. Sin eso los tests no probarian nada. Escaneandolo, el
 * verificador se marca a si mismo y no deja commitear.
 *
 * La exclusion es de UN archivo, no del directorio: `reglas.ts` y este mismo
 * `main.ts` siguen bajo la reja. Y se anuncia en la salida —abajo— porque
 * una exclusion que no se ve es un agujero, y este proyecto ya pago dos
 * veces por rejas que salian en verde sin revisar nada.
 *
 * Que las reglas funcionen no lo demuestra este escaneo: lo demuestran los
 * 31 tests de `reglas.test.ts`, que corren en `unit` y en CI.
 */
const CORPUS_DE_PRUEBA = "scripts/reglas/reglas.test.ts";

function archivosRastreados(): Archivo[] {
  const salida = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  return salida
    .split("\0")
    .filter((ruta) => ruta !== "" && EXTENSIONES.test(ruta))
    .filter((ruta) => ruta !== CORPUS_DE_PRUEBA)
    .map((ruta) => ({ ruta, contenido: readFileSync(ruta, "utf8") }));
}

function informar(hallazgos: Hallazgo[]): void {
  const porRegla = new Map<string, Hallazgo[]>();

  for (const hallazgo of hallazgos) {
    const acumulados = porRegla.get(hallazgo.regla) ?? [];
    acumulados.push(hallazgo);
    porRegla.set(hallazgo.regla, acumulados);
  }

  for (const [id, delGrupo] of porRegla) {
    const regla = reglas.find((candidata) => candidata.id === id);

    console.error(
      `\n  ${regla?.titulo ?? id}  (AGENTS.md, antipatron ${regla?.antipatron})`,
    );

    for (const hallazgo of delGrupo) {
      console.error(`    ${hallazgo.ruta}:${hallazgo.linea}`);
      console.error(`      ${hallazgo.mensaje}`);
    }
  }
}

const archivos = archivosRastreados();
const hallazgos = revisar(archivos);

if (hallazgos.length === 0) {
  console.error(
    `  ${reglas.length} reglas sobre ${archivos.length} archivos: sin hallazgos.`,
  );
  console.error(`  (excluido: ${CORPUS_DE_PRUEBA}, el corpus de prueba)`);
  process.exit(0);
}

informar(hallazgos);
console.error(
  `\n  ${hallazgos.length} hallazgo(s). Las reglas estan en AGENTS.md.\n`,
);
process.exit(1);
