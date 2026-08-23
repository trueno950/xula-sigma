import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que un modulo aporta al exportador. Vive aca y no en `exportar.ts`
 * para que este archivo no dependa de vuelta de el (`exportar.ts` importa
 * `agregarPorciones` de aca, y `PorcionExportable` es su unico tipo
 * compartido).
 *
 * `leer` recibe la transaccion **ya abierta** por `withTenant` y no un
 * manejador de base. No es comodidad: es lo que impide que una porcion
 * exporte de mas. Su consulta puede salir sin `where` de tenant y RLS la
 * acota igual, porque corre con el `app.tenant` de quien pidio la
 * exportacion.
 */
export type PorcionExportable = {
  /** El nombre del conjunto en el archivo entregado. */
  nombre: string;
  leer: (tx: TransaccionTenant) => Promise<readonly unknown[]>;
};

/**
 * Agrega los conjuntos que aportan los modulos a una base ya armada, sin
 * pisar un `nombre` repetido. Separada de `exportar.ts` (que paso las 200
 * lineas por archivo al sumar esta guarda) y para poder probarla sin abrir
 * una transaccion real: un agujero que se encontro de paso (design.md
 * decision 6) es que el `Record` pisaba un `nombre` repetido en silencio,
 * y el archivo entregado perdia un conjunto entero sin que nada avisara.
 */
export const agregarPorciones = async (
  tx: TransaccionTenant,
  base: Record<string, readonly unknown[]>,
  porciones: readonly PorcionExportable[],
): Promise<Record<string, readonly unknown[]>> => {
  const conjuntos = { ...base };

  for (const porcion of porciones) {
    if (porcion.nombre in conjuntos) {
      throw new Error(`Dos porciones reclaman el nombre "${porcion.nombre}".`);
    }

    conjuntos[porcion.nombre] = await porcion.leer(tx);
  }

  return conjuntos;
};
