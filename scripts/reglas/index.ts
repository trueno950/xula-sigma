import {
  assetsAlFilesystem,
  citaSinVersion,
  identificadorConDiacriticos,
  moduloSinCuatroCapas,
} from "./reglas/codigo";
import { metricas } from "./reglas/metricas";
import { rlsEnTablaNueva, secuenciaParaFolios } from "./reglas/migraciones";
import { paginaAnidadaSinMigaja } from "./reglas/navegacion";
import { driverFueraDeTenancy, setSinLocal } from "./reglas/tenancia";
import type { Archivo, Hallazgo, HallazgoMetrica, Regla } from "./tipos";

export type { Archivo, Hallazgo, HallazgoMetrica, Regla } from "./tipos";

export const reglas: Regla[] = [
  driverFueraDeTenancy,
  setSinLocal,
  rlsEnTablaNueva,
  secuenciaParaFolios,
  assetsAlFilesystem,
  identificadorConDiacriticos,
  moduloSinCuatroCapas,
  citaSinVersion,
  paginaAnidadaSinMigaja,
];

export { metricas };

export function revisar(archivos: Archivo[]): Hallazgo[] {
  return reglas.flatMap((regla) =>
    regla.revisar(archivos).map((hallazgo) => ({
      regla: regla.id,
      antipatron: regla.antipatron,
      ...hallazgo,
    })),
  );
}

export function revisarMetricas(archivos: Archivo[]): HallazgoMetrica[] {
  return metricas.flatMap((metrica) =>
    metrica.revisar(archivos).map((hallazgo) => ({
      metrica: metrica.id,
      titulo: metrica.titulo,
      limite: metrica.limite,
      ...hallazgo,
    })),
  );
}
