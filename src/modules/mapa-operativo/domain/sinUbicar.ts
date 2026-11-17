/**
 * S3 de `gestion-municipal`: las calles activas sin punto, agrupadas por el
 * territorio al que pertenecen, para que el mapa diga cuantas le faltan a
 * cada localidad.
 *
 * La cuenta es por territorio y no un total del municipio: "faltan 12" no
 * dice a donde mandar a nadie, y el arbol territorial es justamente lo que
 * el mapa ya usa para acotar la vista.
 */

/** Una calle leida de `territorio`, con la raiz de su territorio. */
export type CalleSinPuntoLeida = {
  readonly calleId: string;
  readonly calleNombre: string;
  readonly lugarId: string;
  readonly raizId: string;
  readonly raizNombre: string;
};

export type CalleSinUbicar = {
  readonly id: string;
  readonly nombre: string;
  /** El registro territorial abierto en esa calle, con la accion de ubicar. */
  readonly href: string;
};

export type TerritorioSinUbicar = {
  readonly id: string;
  readonly nombre: string;
  readonly calles: readonly CalleSinUbicar[];
};

/**
 * Cuantos elementos esperan en la pestana «Sin ubicar» (S6): las calles sin
 * punto y los hechos que no se pueden dibujar. Es el N de la pestana y el del
 * resumen, y por eso vive aca y no en la UI: dos cuentas distintas para el
 * mismo numero terminan diciendo 5 arriba y 4 abajo.
 */
export const contarSinUbicar = (datos: {
  territorios: readonly TerritorioSinUbicar[];
  hechos: number;
}): number =>
  datos.territorios.reduce(
    (total, territorio) => total + territorio.calles.length,
    datos.hechos,
  );

/**
 * El enlace a la pantalla que permite ubicar la calle: el registro
 * territorial con la raiz, el nodo dueno y la accion ya abiertos. Se arma
 * aca, con las claves de la URL tal como las lee
 * `app/(panel)/territorio/parametros.ts`, porque el mapa no importa la UI de
 * `territorio`.
 */
export const hrefDeUbicacion = (datos: {
  raizId: string;
  lugarId: string;
  calleId: string;
}): string =>
  `/territorio?raiz=${datos.raizId}&nodo=${datos.lugarId}&vista=calles&accion=ubicarCalle&calle=${datos.calleId}`;

/**
 * Agrupa por raiz, ordena territorios y calles por nombre y respeta el
 * `?lugar=` elegido: `permitidos` es el conjunto que ya calculo
 * `agregarMapa` -la raiz y su subarbol-, y `null` es «todo el municipio».
 */
export function agruparCallesSinUbicar(datos: {
  calles: readonly CalleSinPuntoLeida[];
  permitidos: ReadonlySet<string> | null;
}): readonly TerritorioSinUbicar[] {
  const visibles = datos.calles.filter(
    (calle) => datos.permitidos === null || datos.permitidos.has(calle.raizId),
  );

  const porRaiz = new Map<
    string,
    { nombre: string; calles: CalleSinUbicar[] }
  >();
  for (const calle of visibles) {
    const grupo = porRaiz.get(calle.raizId) ?? {
      nombre: calle.raizNombre,
      calles: [],
    };
    grupo.calles.push({
      id: calle.calleId,
      nombre: calle.calleNombre,
      href: hrefDeUbicacion({
        raizId: calle.raizId,
        lugarId: calle.lugarId,
        calleId: calle.calleId,
      }),
    });
    porRaiz.set(calle.raizId, grupo);
  }

  return [...porRaiz.entries()]
    .map(([id, grupo]) => ({
      id,
      nombre: grupo.nombre,
      calles: [...grupo.calles].sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      ),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
