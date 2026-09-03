"use client";

import { useEffect, useRef, useState } from "react";
import {
  type SugerenciaDeDuplicado,
  sugerirDuplicadosAction,
} from "./actions/sugerirDuplicados.action";
import { planDeConsulta } from "./planDeConsulta";

const RETARDO_MS = 300;

/**
 * El debounce y la carrera de respuestas de la busqueda de duplicados,
 * aparte del componente: es la unica parte de `SugerenciaDeDuplicados` que
 * no es UI -estado async, referencias, limpieza-, y separarla es lo que
 * deja al componente por debajo del limite de 30 lineas de logica.
 */
export function useSugerenciasDeDuplicados() {
  const [sugerencias, setSugerencias] = useState<
    readonly SugerenciaDeDuplicado[]
  >([]);
  const idDeConsulta = useRef(0);
  const idDeRetardo = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Sin esta limpieza, una consulta pendiente disparaba despues de enviar
  // el formulario: el timer vencia cuando el router ya habia navegado a
  // otra ruta y el POST llegaba ahi con un id de accion que no le
  // pertenecia — 404 "This page could not be found".
  useEffect(() => {
    return () => clearTimeout(idDeRetardo.current);
  }, []);

  const consultar = (nombresNuevo: string, apellidoNuevo: string) => {
    clearTimeout(idDeRetardo.current);
    // La lista se vacia en cuanto cambia lo escrito, no cuando llega la
    // respuesta. Entre el tecleo y el retardo quedaban visibles y
    // seleccionables las personas de la consulta anterior, que ya no son
    // las parecidas a lo que hay en el formulario.
    setSugerencias([]);

    const plan = planDeConsulta(
      nombresNuevo,
      apellidoNuevo,
      () => ++idDeConsulta.current,
    );

    if (plan.tipo === "limpiar") return;

    idDeRetardo.current = setTimeout(async () => {
      // La accion ya atrapa sus propios errores y devuelve `[]`; este
      // catch es para el rechazo de red -conexion caida a mitad del
      // pedido-, que nunca llega a ejecutar la accion en el servidor.
      const encontradas = await sugerirDuplicadosAction(plan.cadena).catch(
        () => [] as const,
      );
      // Ignora una respuesta que ya no es la ultima tecla escrita: sin
      // esto, una respuesta lenta de una consulta vieja puede llegar
      // despues de una mas nueva y pisar sugerencias correctas con unas
      // desactualizadas.
      if (plan.id === idDeConsulta.current) setSugerencias(encontradas);
    }, RETARDO_MS);
  };

  return { sugerencias, consultar };
}
