import { CLASES_DE_DATO } from "@/shared/ui";

/**
 * Lo que va ademas de los conjuntos, y donde queda el registro de las
 * descargas (S14).
 *
 * La bitacora no tiene pantalla en el panel: decirlo aca es lo que evita que
 * la operadora la busque en el menu despues de leer «queda registrada». El
 * registro se lee en el `bitacora.csv` de la siguiente exportacion, que es la
 * unica copia que existe.
 */
export function PieDelInventario({
  conjuntos,
  tieneEscudo,
}: {
  conjuntos: number;
  tieneEscudo: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-caliza-superficie px-4 py-3">
      <p className="text-[15px] leading-[1.5] text-caliza-apagada">
        {`Además de los ${conjuntos} conjuntos va `}
        <code className={CLASES_DE_DATO}>manifiesto.json</code>
        {", con el municipio, su marca y el momento en que se generó, y "}
        {tieneEscudo ? (
          <>
            <code className={CLASES_DE_DATO}>escudo.png</code>
            {", que es el escudo de este municipio."}
          </>
        ) : (
          "nada más: este municipio no tiene escudo cargado."
        )}
      </p>
      <p className="text-[13px] leading-[1.4] text-caliza-apagada">
        La bitácora no tiene una pantalla para consultarla en el panel: cada
        descarga queda anotada con quién la pidió, desde dónde y cuándo, y se
        lee en el <code className={CLASES_DE_DATO}>bitacora.csv</code> de la
        siguiente exportación.
      </p>
    </div>
  );
}
