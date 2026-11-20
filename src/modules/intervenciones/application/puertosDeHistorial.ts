import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { IntervencionId } from "../domain";
import type { ValoresAnterioresDeIntervencion } from "./puertos";

/**
 * Quien hizo un cambio, ya legible: el nombre y el rol del usuario de la
 * revision (S11). Sin el rol, dos administradores se leen igual; sin el
 * nombre, el historial no dice quien respondio por el cambio.
 *
 * Los dos son texto y no el catalogo de roles de `shared/auth`: esta capa no
 * importa el esquema, y el adaptador es el que traduce la fila -mismo corte
 * que `ReferenciasDeIntervencion`.
 */
export type AutorDeIntervencion = {
  nombre: string;
  rol: string;
};

/**
 * Una fila de `revisiones_de_intervenciones` con su autor. `valoresAnteriores`
 * es lo unico que la tabla guarda del cambio: el valor nuevo es el de la
 * revision siguiente o el vigente, y por eso el caso de uso necesita la
 * intervencion ademas del historial.
 */
export type RevisionGuardadaDeIntervencion = {
  id: string;
  valoresAnteriores: ValoresAnterioresDeIntervencion;
  autor: AutorDeIntervencion | null;
  ocurridoEn: Date;
};

/**
 * La lectura del historial y de quien registro la intervencion, en una sola
 * llamada: las dos salen de `usuarios` y pedirlas por separado serian dos
 * transacciones para pintar una tarjeta.
 *
 * El orden de `revisiones` -de la mas vieja a la mas nueva- es parte del
 * contrato: el caso de uso compara cada revision con la siguiente para saber
 * que valor quedo. El adaptador ordena por `ocurridoEn` y desempata por `id`.
 */
export type LectorDeHistorialDeIntervenciones = {
  leer(
    tx: TransaccionTenant,
    datos: {
      intervencionId: IntervencionId;
      registradoPorUsuarioId: string;
    },
  ): Promise<{
    revisiones: readonly RevisionGuardadaDeIntervencion[];
    registradaPor: AutorDeIntervencion | null;
  }>;
};
