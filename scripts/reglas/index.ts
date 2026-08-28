import {
  assetsAlFilesystem,
  citaSinVersion,
  identificadorConDiacriticos,
  moduloSinCuatroCapas,
} from "./reglas/codigo";
import { rlsEnTablaNueva, secuenciaParaFolios } from "./reglas/migraciones";
import { driverFueraDeTenancy, setSinLocal } from "./reglas/tenancia";
import type { Archivo, Hallazgo, Regla } from "./tipos";

export type { Archivo, Hallazgo, Regla } from "./tipos";

export const reglas: Regla[] = [
  driverFueraDeTenancy,
  setSinLocal,
  rlsEnTablaNueva,
  secuenciaParaFolios,
  assetsAlFilesystem,
  identificadorConDiacriticos,
  moduloSinCuatroCapas,
  citaSinVersion,
];

export function revisar(archivos: Archivo[]): Hallazgo[] {
  return reglas.flatMap((regla) =>
    regla.revisar(archivos).map((hallazgo) => ({
      regla: regla.id,
      antipatron: regla.antipatron,
      ...hallazgo,
    })),
  );
}
