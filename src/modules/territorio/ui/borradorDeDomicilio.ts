import { z } from "zod";

/**
 * Lo que el operador capturo en el alta o la correccion de un domicilio
 * cuando el servidor lo rechazo, para que la pagina vuelva a llenar el
 * formulario. Viaja en una cookie (`borradorEnCookie.ts`); aca solo se
 * decide su forma.
 *
 * Los largos maximos no son reglas del domicilio: son el techo para que la
 * cookie, ya escapada con `encodeURIComponent`, quede debajo de los 4096
 * bytes que un navegador acepta. Un id legitimo mide 36; lo que pase se
 * recorta al guardar y se rechaza al leer. El numero y la referencia no
 * tienen largo maximo en el formulario ni en la accion, asi que el recorte
 * puede cortar algo valido: el borrador lo marca (`recortado`) y el
 * formulario rellenado se lo dice al operador.
 */
const LARGO_DE_ID = 36;
const LARGO_DE_NUMERO = 40;
const LARGO_DE_REFERENCIA = 300;

const esquemaDeCampos = z.object({
  calleId: z.string().max(LARGO_DE_ID),
  zonaId: z.string().max(LARGO_DE_ID),
  numero: z.string().max(LARGO_DE_NUMERO),
  entreCalleAId: z.string().max(LARGO_DE_ID),
  entreCalleBId: z.string().max(LARGO_DE_ID),
  referencia: z.string().max(LARGO_DE_REFERENCIA),
});

const esquemaDeDestino = z.discriminatedUnion("formulario", [
  z.object({ formulario: z.literal("alta") }),
  z.object({ formulario: z.literal("correccion"), domicilioId: z.uuid() }),
]);

const esquemaDeBorrador = z.object({
  token: z.uuid(),
  destino: esquemaDeDestino,
  campos: esquemaDeCampos,
  recortado: z.boolean().optional(),
});

export type CamposDeBorrador = z.infer<typeof esquemaDeCampos>;
export type DestinoDeBorrador = z.infer<typeof esquemaDeDestino>;
export type BorradorDeDomicilio = z.infer<typeof esquemaDeBorrador>;

const LARGOS: Record<keyof CamposDeBorrador, number> = {
  calleId: LARGO_DE_ID,
  zonaId: LARGO_DE_ID,
  numero: LARGO_DE_NUMERO,
  entreCalleAId: LARGO_DE_ID,
  entreCalleBId: LARGO_DE_ID,
  referencia: LARGO_DE_REFERENCIA,
};

const textoDe = (valor: FormDataEntryValue | null, largo: number): string =>
  typeof valor === "string" ? valor.slice(0, largo) : "";

/** La colonia se llama `lugarId` en el alta y `zonaId` en la correccion. */
export const camposDelFormulario = (
  formData: FormData,
  nombreDeZona: "lugarId" | "zonaId",
): CamposDeBorrador => ({
  calleId: textoDe(formData.get("calleId"), LARGOS.calleId),
  zonaId: textoDe(formData.get(nombreDeZona), LARGOS.zonaId),
  numero: textoDe(formData.get("numero"), LARGOS.numero),
  entreCalleAId: textoDe(formData.get("entreCalleAId"), LARGOS.entreCalleAId),
  entreCalleBId: textoDe(formData.get("entreCalleBId"), LARGOS.entreCalleBId),
  referencia: textoDe(formData.get("referencia"), LARGOS.referencia),
});

const nombreEnElFormulario = (
  campo: keyof CamposDeBorrador,
  nombreDeZona: "lugarId" | "zonaId",
) => (campo === "zonaId" ? nombreDeZona : campo);

/** Si algun valor capturado pasa su techo y `camposDelFormulario` lo corta. */
export const seRecortaAlGuardar = (
  formData: FormData,
  nombreDeZona: "lugarId" | "zonaId",
): boolean =>
  Object.entries(LARGOS).some(([campo, largo]) => {
    const valor = formData.get(
      nombreEnElFormulario(campo as keyof CamposDeBorrador, nombreDeZona),
    );

    return typeof valor === "string" && valor.length > largo;
  });

export const codificarBorrador = (borrador: BorradorDeDomicilio): string =>
  JSON.stringify(borrador);

const jsonDe = (valor: string): unknown => {
  try {
    return JSON.parse(valor);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

/** La cookie la puede reescribir el navegador: lo que no tenga esta forma se ignora. */
export const decodificarBorrador = (
  valor: string | undefined,
): BorradorDeDomicilio | null => {
  if (!valor) return null;
  const analisis = esquemaDeBorrador.safeParse(jsonDe(valor));

  return analisis.success ? analisis.data : null;
};

const mismoDestino = (a: DestinoDeBorrador, b: DestinoDeBorrador): boolean =>
  a.formulario === "alta"
    ? b.formulario === "alta"
    : b.formulario === "correccion" && a.domicilioId === b.domicilioId;

/** Los valores para un formulario, solo si el borrador salio de ese mismo. */
export const camposPara = (
  borrador: BorradorDeDomicilio | null | undefined,
  destino: DestinoDeBorrador,
): CamposDeBorrador | undefined =>
  borrador && mismoDestino(borrador.destino, destino)
    ? borrador.campos
    : undefined;

/** El borrador de este formulario perdio parte de lo capturado. */
export const avisaRecorte = (
  borrador: BorradorDeDomicilio | null | undefined,
  destino: DestinoDeBorrador,
): boolean =>
  Boolean(borrador?.recortado) && camposPara(borrador, destino) !== undefined;

export const MENSAJE_DE_RECORTE =
  "Parte de lo capturado era demasiado largo y se recortó; revise los campos.";
