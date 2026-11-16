import type { PuntoDeMapa } from "./mapaOperativo";

/** Los hechos que comparten una calle, con el punto con el que se dibujan. */
export type GrupoDeHechos<T> = {
  calleId: string;
  punto: PuntoDeMapa;
  hechos: readonly T[];
};

export type Agrupacion<T> = {
  grupos: readonly GrupoDeHechos<T>[];
  /** Los que no se pueden dibujar: sin calle, o con una calle sin punto. */
  sinPunto: readonly T[];
};

/**
 * Un marcador por calle, no por hecho: el punto del mapa es el de la calle,
 * asi que varios hechos de la misma calle caen exactamente uno encima del
 * otro y dibujarlos por separado solo tapa el de abajo. El orden de entrada
 * se conserva, para que el pin y su contador no cambien de un request a otro.
 */
export function agruparEnCalles<T extends { calleId: string | null }>(
  hechos: readonly T[],
  puntoDeCalle: (calleId: string) => PuntoDeMapa | null,
): Agrupacion<T> {
  const grupos = new Map<string, { punto: PuntoDeMapa; hechos: T[] }>();
  const sinPunto: T[] = [];
  for (const hecho of hechos) {
    const { calleId } = hecho;
    const punto = calleId === null ? null : puntoDeCalle(calleId);
    if (calleId === null || punto === null) {
      sinPunto.push(hecho);
      continue;
    }
    const grupo = grupos.get(calleId);
    if (grupo) grupo.hechos.push(hecho);
    else grupos.set(calleId, { punto, hechos: [hecho] });
  }
  return {
    grupos: [...grupos.entries()].map(([calleId, grupo]) => ({
      calleId,
      punto: grupo.punto,
      hechos: grupo.hechos,
    })),
    sinPunto,
  };
}

/**
 * El valor que mas se repite; un empate se queda con el primero que aparecio.
 * `undefined` sin valores: el llamador decide que hacer con un grupo vacio.
 */
export function predominante<T>(valores: readonly T[]): T | undefined {
  const conteos = new Map<T, number>();
  for (const valor of valores) {
    conteos.set(valor, (conteos.get(valor) ?? 0) + 1);
  }
  let elegido: T | undefined;
  let maximo = 0;
  for (const [valor, conteo] of conteos) {
    if (conteo > maximo) {
      elegido = valor;
      maximo = conteo;
    }
  }
  return elegido;
}
