/**
 * Las reglas de AGENTS.md que una expresion regular decide sola.
 *
 * Existe porque el revisor de IA estaba haciendo este trabajo. Un modelo
 * cuesta dinero por corrida, tarda minutos y no coincide consigo mismo entre
 * dos corridas del mismo comando sobre el mismo diff. Lo que se puede
 * decidir con un patron se decide con un patron: cuesta cero, tarda
 * milisegundos y da el mismo resultado siempre.
 *
 * Al revisor de IA le queda lo que un patron no puede juzgar —si un
 * `try/catch` traga el error, si un nombre es vago, si un comentario
 * reformula el codigo—, que es donde su costo se justifica. Y lo demostro:
 * la revision del PR que introdujo estas reglas encontro que este mismo
 * archivo pasaba de las 200 lineas que pide la tabla de metricas. De ahi
 * sale el corte por tema que ves aca.
 *
 * Cada regla nombra el antipatron de AGENTS.md que aplica. Si un antipatron
 * no esta, es porque pide criterio, no porque se haya olvidado.
 */

export type Archivo = {
  ruta: string;
  contenido: string;
};

export type Hallazgo = {
  regla: string;
  antipatron: number;
  ruta: string;
  linea: number;
  mensaje: string;
};

export type Regla = {
  id: string;
  antipatron: number;
  titulo: string;
  revisar(archivos: Archivo[]): Omit<Hallazgo, "regla" | "antipatron">[];
};
