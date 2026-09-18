import type { CalleId, DomicilioId, LugarId, TipoDeLugar } from "../domain";

/**
 * Una fila del subarbol de `raizId`: un lugar descendiente (cualquier
 * profundidad, `raizId` mismo excluido) o un domicilio colgado de `raizId`
 * o de cualquiera de sus descendientes (design.md seccion 12, "SUBARBOL").
 * Union discriminada y no dos arreglos separados porque el consumidor —el
 * arbol de la UI (tasks.md 3.20)— recorre ambas clases en el mismo orden
 * de aparicion para anidar domicilios bajo el nodo que los contiene.
 *
 * Vive aparte de `puertos.ts` por la metrica de 200 lineas de `AGENTS.md`:
 * ese archivo llegaba a 213 con los dos repositorios y este tipo. El corte
 * cae por tema -el nodo del arbol, que comparten `application`,
 * `infrastructure` y `ui`-, y `puertos.ts` lo reexporta, asi que nadie
 * cambia de import.
 *
 * La variante `domicilio` lleva su etiqueta completa -calle y numero-, que
 * es lo que dejo de necesitar el listado plano del municipio en `page.tsx`
 * (design.md seccion 1, "El cargado ansioso muere aca"). Lleva tambien
 * `calleId`: `hermanos` compara identidad de direccion, y el nombre de la
 * calle no es identidad -dos calles del mismo nombre conviven en un lugar
 * cuando una quedo de baja, `calles_tenant_lugar_nombre_idx` es un unico
 * parcial sobre `baja_en IS NULL`-. El porque del nombre tambien esta en
 * `puertosDeDomicilios.ts`, `DomicilioParaListado.calleId`.
 */
export type NodoDeSubarbol =
  | {
      clase: "lugar";
      id: LugarId;
      tipo: TipoDeLugar;
      nombre: string;
      padreId: LugarId | null;
    }
  | {
      clase: "domicilio";
      id: DomicilioId;
      lugarId: LugarId;
      calleId: CalleId;
      calle: string;
      numero: string | null;
    };
