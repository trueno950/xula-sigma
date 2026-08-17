import type { CSSProperties } from "react";
import { z } from "zod";

/**
 * La marca del municipio: lo que se pinta antes de que exista sesion.
 *
 * `ayuntamientos.marca` es `jsonb`, o sea `unknown` del lado de TypeScript.
 * Validarlo con Zod no es ceremonia: esos colores van a un atributo `style`
 * y salen de una columna que alguien edita. Sin validar, un valor con
 * `;background:url(...)` adentro se inyecta en el CSS de la pagina.
 *
 * **Contraste: pendiente.** `docs/06-frontend.md` seccion 6 pide validar
 * contraste minimo contra el color de texto y caer a un valor seguro. No
 * esta hecho: un municipio que elija guinda con texto negro va a quedar
 * ilegible. Se declara antes que taparlo — entra con el design system.
 */

/**
 * Solo `oklch(...)`, `#rgb`/`#rrggbb` y nombres simples. La lista blanca es
 * a proposito: cualquier cosa que no sea exactamente un color no entra.
 */
const COLOR = /^(#[0-9a-f]{3,8}|oklch\([\d.\s%-]+\)|[a-z]+)$/i;

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

/** Lo que no valida se descarta entero y quedan los valores por defecto. */
export const leerMarca = (valor: unknown): Marca => {
  const resultado = esquemaDeMarca.safeParse(valor);

  return resultado.success ? resultado.data : {};
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
