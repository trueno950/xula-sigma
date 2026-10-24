import type { TipoDeLugarAnterior } from "./baseAnteriorAlCorteDePrueba";
import type { LugarId } from "./domain";

export type LugarBorradoDeSalida = {
  subdominio: string;
  lugarId: LugarId;
  /** Los dos tipos que el corte de 0020 elimino: la salida los trae tal cual. */
  tipo: Extract<TipoDeLugarAnterior, "sector" | "manzana">;
  nombre: string;
  padreId: LugarId | null;
  bajaEn: string | null;
};
