import type { CSSProperties } from "react";
import { z } from "zod";
import { CONTRASTE_MINIMO, contraste, luminancia } from "./contraste";

/**
 * La marca del municipio: lo que se pinta antes de que exista sesion.
 *
 * `ayuntamientos.marca` es `jsonb`, o sea `unknown` del lado de TypeScript.
 * Validarlo con Zod no es ceremonia: esos colores van a un atributo `style`
 * y salen de una columna que alguien edita. Sin validar, un valor con
 * `;background:url(...)` adentro se inyecta en el CSS de la pagina.
 *
 * Ademas del formato se valida el contraste. Ver `contraste.ts`.
 */

/**
 * Solo `oklch(...)` y `#rgb`/`#rrggbb`. Es una lista blanca: cualquier cosa
 * que no sea exactamente un color no entra, y ademas se acota a lo que
 * `contraste.ts` sabe medir.
 *
 * Por que los nombres de CSS y el hex con alfa quedaron afuera:
 * `docs/06-frontend.md` seccion 6.
 */
const COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|oklch\([\d.\s%-]+\))$/i;

/**
 * Dos chequeos y los dos hacen falta.
 *
 * El regex acota los caracteres, que es lo que cierra la inyeccion de CSS.
 * La medibilidad la decide `luminancia`, o sea **el mismo parser que
 * despues mide**: un regex que la aproximara seria una segunda gramatica de
 * `oklch` viviendo lejos de la primera, y dos gramaticas del mismo formato
 * divergen. La forma `oklch(0.5)` es exactamente eso — pasa el regex y no
 * se puede medir.
 *
 * El orden tampoco es casual: sin el regex, `luminancia` acepta cosas como
 * `oklch(0x10 0 0)`, porque `Number` entiende hexadecimal y el parser de
 * color no tiene por que saber que su salida termina en un atributo
 * `style`.
 */
const color = z
  .string()
  .regex(COLOR)
  .refine((valor) => luminancia(valor) !== null);

/**
 * `z.url()` **no alcanza**: `javascript:alert(1)` es una URL valida para el
 * parser y pasa el esquema. Verificado — el test lo agarro. El escudo va a
 * un `src`, asi que el protocolo se acota a http y https.
 */
const urlDeAsset = z.url().refine((valor) => {
  const protocolo = URL.parse(valor)?.protocol;

  return protocolo === "https:" || protocolo === "http:";
});

const esquemaDeMarca = z.object({
  primario: color.optional(),
  primarioTexto: color.optional(),
  secundario: color.optional(),
  escudo: urlDeAsset.optional(),
});

export type Marca = z.infer<typeof esquemaDeMarca>;

/**
 * Los mismos valores que `globals.css` declara como fallback de `--primary`
 * y `--primary-foreground`. Estan repetidos porque el CSS no se importa
 * desde TypeScript, y una copia que diverge mide el contraste contra un
 * color que la pagina no pinta: la reja seguiria en verde mientras el
 * municipio ve un boton ilegible. Lo unico que los ata es un test de
 * `marca.test.ts` que lee el archivo y compara.
 *
 * Por que hace falta medir contra el defecto y no basta el par de la
 * columna: `docs/06-frontend.md` seccion 6.
 */
export const PRIMARIO_POR_DEFECTO = "oklch(0.42 0.12 25)";
export const PRIMARIO_TEXTO_POR_DEFECTO = "oklch(0.99 0 0)";

/**
 * El par que de verdad se va a pintar alcanza el piso de contraste.
 *
 * `--accent` queda afuera **de esta reja y solo de esta**: la medibilidad
 * la valida el esquema para todos los colores. Por que, en
 * `docs/06-frontend.md` seccion 6.
 */
const legible = (marca: Marca): boolean => {
  const razon = contraste(
    marca.primario ?? PRIMARIO_POR_DEFECTO,
    marca.primarioTexto ?? PRIMARIO_TEXTO_POR_DEFECTO,
  );

  return razon !== null && razon >= CONTRASTE_MINIMO;
};

/** Lo que no valida se descarta entero y quedan los valores por defecto. */
export const leerMarca = (valor: unknown): Marca => {
  const resultado = esquemaDeMarca.safeParse(valor);

  if (!resultado.success || !legible(resultado.data)) return {};

  return resultado.data;
};

/**
 * Las variables CSS que consume `globals.css`, para el `style` del layout.
 *
 * **En el servidor y nunca en el cliente.** Aplicadas despues de hidratar,
 * el municipio ve medio segundo la marca por defecto y despues cambia.
 */
export const variablesDeMarca = (marca: Marca): CSSProperties =>
  ({
    ...(marca.primario ? { "--primary": marca.primario } : {}),
    ...(marca.primarioTexto
      ? { "--primary-foreground": marca.primarioTexto }
      : {}),
    ...(marca.secundario ? { "--accent": marca.secundario } : {}),
  }) as CSSProperties;
