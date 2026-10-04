import type {
  CalleGuardada,
  LugarGuardado,
  LugarId,
} from "@/modules/territorio";
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
  lugarId: LugarId,
): readonly LugarDeContexto[] | null => {
  const porId = new Map(lugares.map((lugar) => [lugar.id, lugar]));
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

const sinCadena = (calle: CalleDeContexto): ContextoDeCalle => ({
  migaja: [
    { etiqueta: "Territorio", href: "/territorio" },
    { etiqueta: calle.nombre },
    { etiqueta: "Historial" },
  ],
  volverHref: "/territorio",
  volverEtiqueta: "Volver a Territorio",
});

const hrefDeLugar = (raizId: LugarId, nodoId: LugarId) =>
  `/territorio?raiz=${raizId}&nodo=${nodoId}`;

const migajaDe = (
  calle: CalleDeContexto,
  pasosDeLugares: readonly PasoDeMigaja[],
  hrefDeCalle: string,
): readonly PasoDeMigaja[] => [
  { etiqueta: "Territorio", href: "/territorio" },
  ...pasosDeLugares,
  calle.bajaEn !== null
    ? { etiqueta: calle.nombre }
    : { etiqueta: calle.nombre, href: hrefDeCalle },
  { etiqueta: "Historial" },
];

export function contextoDeCalle(
  calle: CalleDeContexto,
  lugares: readonly LugarDeContexto[],
): ContextoDeCalle {
  const cadena = cadenaDeLugares(lugares, calle.lugarId);
  if (!cadena?.[0]) return sinCadena(calle);

  const raizId = cadena[0].id;
  const hrefDeCalle = rutaDe({
    raizId,
    nodoId: calle.lugarId,
    vista: "calles",
    calleId: calle.id,
  });
  const pasosDeLugares = cadena.map((lugar) => ({
    etiqueta: lugar.nombre,
    href: hrefDeLugar(raizId, lugar.id),
  }));
  const deBaja = calle.bajaEn !== null;

  return {
    migaja: migajaDe(calle, pasosDeLugares, hrefDeCalle),
    volverHref: deBaja ? hrefDeLugar(raizId, calle.lugarId) : hrefDeCalle,
    volverEtiqueta: deBaja ? "Volver al lugar" : "Volver a la calle",
  };
}
