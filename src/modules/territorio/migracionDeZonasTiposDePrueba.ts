import type { LugarId } from "./domain";

export type LugarBorradoDeSalida = {
  subdominio: string;
  lugarId: LugarId;
  tipo: "sector" | "manzana";
  nombre: string;
  padreId: LugarId | null;
  bajaEn: string | null;
};
