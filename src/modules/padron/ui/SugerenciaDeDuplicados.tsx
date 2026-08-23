"use client";

import { useRef, useState } from "react";
import {
  type SugerenciaDeDuplicado,
  sugerirDuplicadosAction,
} from "./actions/sugerirDuplicados.action";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";
const RETARDO_MS = 300;

/**
 * Unica hoja `"use client"` de la rebanada 4 (tasks.md 4.25): mostrar
 * sugerencias mientras se escribe necesita estado de cliente, y no existe
 * forma de pedirselo a un Server Component.
 *
 * Reemplaza los campos `nombres`/`primerApellido` de
 * `FormularioDeAltaDePersona` en vez de vivir al lado: los dos siguen
 * llevando su `name` nativo, asi que el `<form action>` que los envuelve
 * los sigue leyendo igual al enviar. La sugerencia nunca bloquea ese envio
 * (spec, "nunca bloqueante") — es un panel informativo, no una validacion.
 */
export function SugerenciaDeDuplicados() {
  const [nombres, setNombres] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [sugerencias, setSugerencias] = useState<
    readonly SugerenciaDeDuplicado[]
  >([]);
  const idDeConsulta = useRef(0);
  const idDeRetardo = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const consultar = (nombresNuevo: string, apellidoNuevo: string) => {
    clearTimeout(idDeRetardo.current);

    const cadena = `${nombresNuevo} ${apellidoNuevo}`.trim();
    if (!cadena) {
      setSugerencias([]);
      return;
    }

    const consultaActual = ++idDeConsulta.current;

    idDeRetardo.current = setTimeout(async () => {
      // La accion ya atrapa sus propios errores y devuelve `[]`; este
      // catch es para el rechazo de red -conexion caida a mitad del
      // pedido-, que nunca llega a ejecutar la accion en el servidor.
      const encontradas = await sugerirDuplicadosAction(cadena).catch(
        () => [] as const,
      );
      // Ignora una respuesta que ya no es la ultima tecla escrita: sin
      // esto, una respuesta lenta de una consulta vieja puede llegar
      // despues de una mas nueva y pisar sugerencias correctas con unas
      // desactualizadas.
      if (consultaActual === idDeConsulta.current) setSugerencias(encontradas);
    }, RETARDO_MS);
  };

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Nombres</span>
        <input
          name="nombres"
          type="text"
          required
          className={CLASE_CAMPO}
          value={nombres}
          onChange={(evento) => {
            setNombres(evento.target.value);
            consultar(evento.target.value, primerApellido);
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Primer apellido</span>
        <input
          name="primerApellido"
          type="text"
          required
          className={CLASE_CAMPO}
          value={primerApellido}
          onChange={(evento) => {
            setPrimerApellido(evento.target.value);
            consultar(nombres, evento.target.value);
          }}
        />
      </label>

      {sugerencias.length > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-sm border border-caliza-borde bg-caliza-lienzo p-3"
        >
          <span className={CLASE_ETIQUETA}>
            Ya existen personas parecidas. Revisa antes de continuar:
          </span>
          <ul className="flex flex-col gap-1 text-[15px] text-caliza-tinta">
            {sugerencias.map((persona) => (
              <li key={persona.id}>
                {[
                  persona.nombres,
                  persona.primerApellido,
                  persona.segundoApellido,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
