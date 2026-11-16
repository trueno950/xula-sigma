import { colorDeEstado } from "./coloresDeEstado";
import { etiquetaDeFiltro } from "./etiquetasDeFiltro";
import { type ClaveDeIcono, iconoDe } from "./iconos";
import type { RecursoDeMapa } from "./recursoDeMapa";

export type EntradaDeTipo = {
  recurso: RecursoDeMapa;
  tipo: string;
  etiqueta: string;
  icono: ClaveDeIcono;
  conteo: number;
};

export type EntradaDeEstado = {
  estado: string;
  etiqueta: string;
  color: string;
  conteo: number;
};

export type LeyendaDelMapa = {
  tipos: readonly EntradaDeTipo[];
  estados: readonly EntradaDeEstado[];
  /** Reportes que pasaron el umbral de atraso del municipio (S1). */
  atrasados: number;
};

export type HechoContable = {
  recurso: RecursoDeMapa;
  tipo: string;
  estado: string;
  /**
   * Los dias de atraso del hecho, si los tiene. Opcional para los dobles de
   * prueba que solo cuentan tipos y estados: ausente es "no esta atrasado".
   */
  diasDeAtraso?: number | null;
};

/**
 * La leyenda es un conteo de los hechos que pasaron el filtro, no de los
 * pines: un marcador agrupado cuenta cada hecho que lleva adentro. El mismo
 * tipo en reporte y en intervencion son dos renglones, porque `BACHE`
 * significa cosas distintas segun quien lo registre.
 *
 * `atrasados` es el conteo de S1 y va aparte de los dos anteriores: no es un
 * tipo ni un estado, es la senal de que el municipio se esta pasando de su
 * propio umbral, y por eso tiene su renglon en la leyenda.
 */
export function construirLeyenda(
  hechos: readonly HechoContable[],
): LeyendaDelMapa {
  const tipos = new Map<string, EntradaDeTipo>();
  const estados = new Map<string, EntradaDeEstado>();
  for (const hecho of hechos) {
    const clave = `${hecho.recurso}:${hecho.tipo}`;
    const deTipo = tipos.get(clave);
    if (deTipo) deTipo.conteo += 1;
    else
      tipos.set(clave, {
        recurso: hecho.recurso,
        tipo: hecho.tipo,
        etiqueta: etiquetaDeFiltro(hecho.tipo),
        icono: iconoDe(hecho.tipo),
        conteo: 1,
      });
    const deEstado = estados.get(hecho.estado);
    if (deEstado) deEstado.conteo += 1;
    else
      estados.set(hecho.estado, {
        estado: hecho.estado,
        etiqueta: etiquetaDeFiltro(hecho.estado),
        color: colorDeEstado(hecho.estado),
        conteo: 1,
      });
  }
  return {
    tipos: [...tipos.values()],
    estados: [...estados.values()],
    atrasados: hechos.filter((hecho) => (hecho.diasDeAtraso ?? null) !== null)
      .length,
  };
}
