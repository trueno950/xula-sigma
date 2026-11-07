import type { UsoDeCalle } from "../application/usoDeCalle";
import { cantidad } from "./bloqueosDeLugar";

/**
 * Que acciones de la calle abierta no se ofrecen y por que, con el uso ya
 * leido. Sin uso (`null`: la lectura fallo) no se esconde nada y decide el
 * servidor. Mover lo rechaza `reparentearCalle` con domicilios o con
 * cualquier zona, incluso dada de baja; la baja la rechaza `darDeBajaCalle`
 * con domicilios o con una zona activa.
 */
export type BloqueosDeCalle = {
  readonly mover: boolean;
  readonly baja: boolean;
  readonly motivo: string | null;
};

const SIN_BLOQUEOS: BloqueosDeCalle = {
  mover: false,
  baja: false,
  motivo: null,
};

export const bloqueosDeCalle = (
  uso: UsoDeCalle | null | undefined,
): BloqueosDeCalle => {
  if (!uso) return SIN_BLOQUEOS;
  const { domicilios, zonas, zonasActivas } = uso;

  if (domicilios > 0) {
    return {
      mover: true,
      baja: true,
      motivo: `La usan ${cantidad(domicilios, "domicilio", "domicilios")}. Para moverla o darla de baja, corríjalos primero.`,
    };
  }
  if (zonasActivas > 0) {
    return {
      mover: true,
      baja: true,
      motivo: `Está en ${cantidad(zonasActivas, "zona", "zonas")}. Para moverla o darla de baja, quítela de ${zonasActivas === 1 ? "ella" : "ellas"} primero.`,
    };
  }
  if (zonas > 0) {
    return {
      mover: true,
      baja: false,
      motivo: `Estuvo en ${cantidad(zonas, "zona", "zonas")} ya dada${zonas === 1 ? "" : "s"} de baja: no se puede mover a otro lugar.`,
    };
  }

  return SIN_BLOQUEOS;
};
