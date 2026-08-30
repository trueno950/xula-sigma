import { z } from "zod";

/**
 * La validacion del bloque de firma de `constancias`: lo que decide si un
 * valor de `configuracion_de_documentos.datos` (jsonb, `unknown` del lado
 * de TypeScript) es seguro para renderizar en un PDF y para escribir.
 *
 * Vive en `constancias/application/` y no en `domain`: `dominio-no-importa-nada`
 * (`.dependency-cruiser.cjs`) solo deja pasar `npm-dev`, y Zod es dependencia
 * de produccion. Tampoco en `shared/`: el precedente `shared/marca/validacion.ts`
 * esta ahi porque `shared/ui` tambien lo necesita; aca los tres consumidores
 * -el caso de uso de configuracion, `emitirConstancia` y la plantilla PDF-
 * viven dentro de `constancias`, y `shared` no puede importar modulos
 * (design.md de `constancias-oficios`, decision 8).
 */

/**
 * Plano y no anidado, copiando `esquemaDeMarca`: `camposDe` mapea el error
 * al campo tomando `issue.path[0]`, y eso solo funciona si el esquema no
 * tiene objetos adentro. Un `firmante: { … }` mandaria todos los errores al
 * campo "firmante".
 *
 * Los topes son de maquetacion, no de seguridad, y por eso son numeros y no
 * regex: estos valores van a un PDF de estructura fija, no a un atributo
 * `style` -el vector que justifica la lista blanca de colores de `marca`
 * no existe aca-.
 */
const esquemaDeDocumentos = z.object({
  firmanteNombre: z.string().trim().min(3).max(120),
  firmanteCargo: z.string().trim().min(3).max(120),
  leyendaDePie: z.string().trim().max(300).optional(),
});

export type Documentos = z.infer<typeof esquemaDeDocumentos>;

export type ResultadoDeDocumentos =
  | { ok: true; documentos: Documentos }
  | { ok: false; campos: Record<string, string> };

/**
 * El nombre de campo que le corresponde a cada issue de Zod. Solo se toma
 * el primero: `esquemaDeDocumentos` es plano, sin objetos anidados, asi que
 * el primer segmento del path ya es el campo completo.
 */
const camposDe = (error: z.ZodError): Record<string, string> => {
  const campos: Record<string, string> = {};

  for (const issue of error.issues) {
    const campo =
      typeof issue.path[0] === "string" ? issue.path[0] : "documentos";

    campos[campo] ??= `El valor de "${campo}" no es valido.`;
  }

  return campos;
};

export const validarDocumentos = (valor: unknown): ResultadoDeDocumentos => {
  const resultado = esquemaDeDocumentos.safeParse(valor);

  if (!resultado.success)
    return { ok: false, campos: camposDe(resultado.error) };

  return { ok: true, documentos: resultado.data };
};

/**
 * `leerMarca` devuelve `{}` cuando no valida, porque para colores el valor
 * por defecto es una respuesta correcta. **`leerDocumentos` devuelve
 * `null`**, porque sin bloque de firma no se emite (decision 19 de
 * `proposal.md`): degradar a valores por defecto renderizaria la hoja sin
 * firmante, que es justo lo que esa decision prohibe.
 */
export const leerDocumentos = (valor: unknown): Documentos | null => {
  const resultado = validarDocumentos(valor);

  return resultado.ok ? resultado.documentos : null;
};
