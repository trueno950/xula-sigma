import { Users } from "@phosphor-icons/react/ssr";
import type { Marca } from "@/shared/marca";
import { CLASES_DE_ETIQUETA, clasesDeBoton } from "@/shared/ui/estilos";
import { medirAcento, razonFormateada } from "./acentoDeLaMarca";
import { ImagenDeEscudo } from "./ImagenDeEscudo";

type Props = {
  nombre: string;
  marca: Marca;
};

const CLASES_DE_MINI =
  "grid grid-cols-1 gap-4 rounded-sm bg-caliza-superficie p-3 " +
  "sm:grid-cols-[200px_minmax(0,1fr)]";

/**
 * La marca **guardada**, primero (S1): la banda del municipio, el item activo
 * de la navegacion, el boton primario y el acento.
 *
 * Se pinta desde el servidor y con los tokens de la marca (`bg-marca`,
 * `bg-marca-tenue`, `bg-marca-suave`, `bg-acento`), que resuelven a las
 * variables que inyecta `(panel)/layout.tsx` desde la fila del ayuntamiento —
 * no hay color propio aca ni una segunda copia en el cliente (antipatron 13
 * de `AGENTS.md`).
 *
 * El texto de encima del acento no es un token fijo: es el que **mide** mas
 * contraste, y la pantalla dice el numero medido (S3). La muestra no promete
 * una legibilidad que el color no tiene.
 *
 * Es decorativa —el `aria-hidden` del mini— y lo que de verdad se lee son las
 * dos lineas del pie: el mini no agrega informacion que los textos no digan.
 */
export function VistaPreviaDeMarca({ nombre, marca }: Props) {
  const medido = medirAcento(marca.secundario);

  return (
    <section
      aria-labelledby="s-previa"
      className="flex flex-col gap-4 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-5 text-caliza-tinta shadow-reposo"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="s-previa"
          className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em]"
        >
          Cómo se ve el panel hoy
        </h2>
        <p className={CLASES_DE_ETIQUETA}>
          Con el escudo y los colores guardados
        </p>
      </div>

      <div aria-hidden="true" className={CLASES_DE_MINI}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-sm bg-marca-tenue p-2 text-[15px] font-semibold">
            {marca.escudo ? (
              <ImagenDeEscudo
                escudo={marca.escudo}
                className="size-6 shrink-0 object-contain"
              />
            ) : null}
            <span className="min-w-0 truncate">{nombre}</span>
          </div>
          <span className="flex h-9 items-center gap-2 rounded-sm bg-marca-suave px-2 text-[15px] font-semibold">
            <Users size={18} className="shrink-0 text-marca" />
            Padrón
          </span>
        </div>

        <div className="flex flex-col items-start gap-3">
          <span className={`${clasesDeBoton("primaria")} pointer-events-none`}>
            Nueva persona
          </span>
          {medido ? (
            <span
              className="inline-flex items-center rounded-sm bg-acento px-2.5 py-1 text-[13px] font-semibold"
              style={{ color: medido.texto }}
            >
              Énfasis secundario
            </span>
          ) : (
            <span className="inline-block h-6 w-32 rounded-sm bg-acento" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-caliza-divisor pt-3">
        <p className="text-[13px] leading-[1.4] text-caliza-apagada">
          El texto del botón principal lo elige el servidor —blanco o tinta, el
          que más contraste dé—, no la persona que elige el color.
        </p>
        {medido ? (
          <p className="text-[13px] leading-[1.4] text-caliza-apagada">
            El acento va de relleno y el texto encima es el que más contrasta
            con el color guardado:{" "}
            <span className="font-mono tabular-nums text-caliza-tinta">
              {razonFormateada(medido.razon)}
            </span>
            . El acento no se usa como color de texto.
          </p>
        ) : (
          <p className="text-[13px] leading-[1.4] text-caliza-apagada">
            Sin un acento medible, la muestra lo pinta solo como relleno, sin
            texto encima. El acento no se usa como color de texto.
          </p>
        )}
      </div>
    </section>
  );
}
