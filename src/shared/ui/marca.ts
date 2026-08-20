import type { CSSProperties } from "react";
import { z } from "zod";
import { CONTRASTE_MINIMO, contraste } from "./contraste";

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
 * Solo `oklch(...)` y `#rgb`/`#rrggbb`. La lista blanca es a proposito:
 * cualquier cosa que no sea exactamente un color no entra.
 *
 * **Y solo lo que se puede medir.** Antes tambien aceptaba nombres
 * (`red`, `rebeccapurple`) y hex con alfa. Los dos salieron cuando entro
 * la reja de contraste: medir un nombre pide la tabla de los 148 de CSS, y
 * el contraste de un color translucido depende de lo que tenga atras. Una
 * entrada de la lista blanca que no se puede medir vacia la garantia.
 */
const COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|oklch\([\d.\s%-]+\))$/i;

const color = z.string().regex(COLOR);

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
 * Se necesitan aca porque una marca puede traer solo el color primario, y
 * entonces el par que se pinta mezcla un valor de la columna con uno del
 * CSS. Medir el primario contra si mismo no diria nada.
 */
export const PRIMARIO_POR_DEFECTO = "oklch(0.42 0.12 25)";
export const PRIMARIO_TEXTO_POR_DEFECTO = "oklch(0.99 0 0)";

/**
 * El par que de verdad se va a pintar alcanza el piso de contraste.
 *
 * `--accent` queda afuera y no por descuido: el esquema no declara su color
 * de texto, asi que no hay par que medir. Entra cuando el design system lo
 * declare.
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
