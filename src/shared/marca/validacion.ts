import { z } from "zod";
import { CONTRASTE_MINIMO, contraste, luminancia } from "./contraste";

/**
 * La validacion de la marca del municipio: lo que decide si un valor de
 * `ayuntamientos.marca` (jsonb, `unknown` del lado de TypeScript) es
 * seguro para pintar y para escribir.
 *
 * Vive en `shared/marca/` y no en `shared/ui/`: es una regla de negocio
 * —tambien la usa `modules/marca/application/cambiarEscudo.ts`, que no
 * puede importar de `shared/ui/` (`application-no-importa-shared-ui` en
 * `.dependency-cruiser.cjs`)—, no una preocupacion de presentacion.
 * `shared/ui/marca.ts` se queda solo con `variablesDeMarca`, que devuelve
 * `CSSProperties` y esa si es UI.
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
 * Dos chequeos: el regex acota los caracteres y `luminancia` decide la
 * medibilidad. Por que el reparto es ese, en `docs/06-frontend.md`
 * seccion 6.
 *
 * El orden si es de aca: sin el regex delante, `luminancia` acepta cosas
 * como `oklch(0x10 0 0)`, porque `Number` entiende hexadecimal y un parser
 * de color no tiene por que saber que su salida termina en un atributo
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
export const urlDeAsset = z.url().refine((valor) => {
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
 * `validacion.test.ts` que lee el archivo y compara.
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

export type ResultadoDeMarca =
  | { ok: true; marca: Marca }
  | { ok: false; campos: Record<string, string> };

/**
 * El nombre de campo que le corresponde a cada issue de Zod. Solo se toma
 * el primero: `esquemaDeMarca` es plano, sin objetos anidados, asi que el
 * primer segmento del path ya es el campo completo.
 */
const camposDe = (error: z.ZodError): Record<string, string> => {
  const campos: Record<string, string> = {};

  for (const issue of error.issues) {
    const campo = typeof issue.path[0] === "string" ? issue.path[0] : "marca";

    campos[campo] ??= `El valor de "${campo}" no es valido.`;
  }

  return campos;
};

/**
 * Corre el esquema **y** la reja de contraste. Es la precondicion de
 * escritura del cambio de escudo: escribir sobre una marca compone el
 * `escudo` nuevo con los campos existentes y valida el resultado completo
 * con esta misma funcion antes de guardar nada.
 *
 * Una falla de contraste se nombra `contraste` y no `primario` ni
 * `primarioTexto`: no es un color el que esta mal, es el par.
 */
export const validarMarca = (valor: unknown): ResultadoDeMarca => {
  const resultado = esquemaDeMarca.safeParse(valor);

  if (!resultado.success)
    return { ok: false, campos: camposDe(resultado.error) };

  if (!legible(resultado.data)) {
    return {
      ok: false,
      campos: {
        contraste: "El primario y el texto no tienen suficiente contraste.",
      },
    };
  }

  return { ok: true, marca: resultado.data };
};

/** Lo que no valida se descarta entero y quedan los valores por defecto. */
export const leerMarca = (valor: unknown): Marca => {
  const resultado = validarMarca(valor);

  return resultado.ok ? resultado.marca : {};
};
