import type { CalleGuardada, LugarGuardado } from "@/modules/territorio";
import { rutaDe } from "@/modules/territorio/ui/contenido";
import type { PasoDeMigaja } from "@/shared/ui";

type CalleDeContexto = Pick<
  CalleGuardada,
  "id" | "nombre" | "lugarId" | "bajaEn"
>;
type LugarDeContexto = Pick<
  LugarGuardado,
  "id" | "nombre" | "padreId" | "bajaEn"
>;

export type ContextoDeCalle = {
  migaja: readonly PasoDeMigaja[];
  volverHref: string;
  volverEtiqueta: string;
};

const PROFUNDIDAD_MAXIMA = 16;

/**
 * De la raíz al lugar de la calle, o `null` si la cadena no se puede
 * recorrer: un padre ausente, un lugar de baja o un ciclo. Territorio
 * responde 404 a un nodo de baja, así que enlazarlo sería un callejón.
 */
const cadenaDeLugares = (
  lugares: readonly LugarDeContexto[],
  lugarId: string,
): readonly LugarDeContexto[] | null => {
  const porId = new Map(lugares.map((lugar) => [lugar.id as string, lugar]));
  const cadena: LugarDeContexto[] = [];
  let actual = porId.get(lugarId);

  while (actual && cadena.length < PROFUNDIDAD_MAXIMA) {
    if (actual.bajaEn) return null;
    cadena.unshift(actual);
    if (actual.padreId === null) return cadena;
    actual = porId.get(actual.padreId);
  }
  return null;
};

export function contextoDeCalle(
  calle: CalleDeContexto,
  lugares: readonly LugarDeContexto[],
): ContextoDeCalle {
  const cadena = cadenaDeLugares(lugares, calle.lugarId);
  const historial = { etiqueta: "Historial" };

  if (!cadena?.[0]) {
    return {
      migaja: [
        { etiqueta: "Territorio", href: "/territorio" },
        { etiqueta: calle.nombre },
        historial,
      ],
      volverHref: "/territorio",
      volverEtiqueta: "Volver a Territorio",
    };
  }

  const raizId = cadena[0].id;
  const hrefDeLugar = (nodoId: string) =>
    `/territorio?raiz=${raizId}&nodo=${nodoId}`;
  const hrefDeCalle = rutaDe({
    raizId,
    nodoId: calle.lugarId,
    vista: "calles",
    calleId: calle.id,
  });
  const deBaja = calle.bajaEn !== null;

  return {
    migaja: [
      { etiqueta: "Territorio", href: "/territorio" },
      ...cadena.map((lugar) => ({
        etiqueta: lugar.nombre,
        href: hrefDeLugar(lugar.id),
      })),
      deBaja
        ? { etiqueta: calle.nombre }
        : { etiqueta: calle.nombre, href: hrefDeCalle },
      historial,
    ],
    volverHref: deBaja ? hrefDeLugar(calle.lugarId) : hrefDeCalle,
    volverEtiqueta: deBaja ? "Volver al lugar" : "Volver a la calle",
  };
}
