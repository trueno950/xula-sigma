"use client";

import { useRef, useState, useTransition } from "react";
import { CampoDeLista, type OpcionDeLista } from "@/shared/ui";
import {
  buscarSimilaresAction,
  type ReporteSimilarParaCliente,
} from "./actions/buscarSimilaresAction";
import { ReportesSimilares } from "./ReportesSimilares";

export type OpcionDeCalle = OpcionDeLista & { lugarId: string };

type Props = {
  lugares: readonly OpcionDeLista[];
  calles: readonly OpcionDeCalle[];
  tipos: readonly OpcionDeLista[];
};

/**
 * La unica isla `"use client"` del modulo (design.md seccion 15,
 * tasks.md 7.8): reacciona a lugar y tipo para disparar el buscador de
 * similares (decision 15 de `proposal.md`) sin recargar la pagina.
 * `descripcion` y `referencia` quedan fuera de esta isla, en el Server
 * Component -es la razon de ser una isla y no un `<form>` GET: un envio GET
 * pondria esos campos en `searchParams`, o sea en el log de acceso del
 * proveedor y en el `Referer`, exactamente lo que la decision 13 protege.
 * Los tres `<select>` conservan su `name` nativo: el envio del formulario
 * sigue siendo el POST nativo de `altaDeReporteAction`.
 */
export function SelectorDeUbicacionYTipo({ lugares, calles, tipos }: Props) {
  const [lugarId, setLugarId] = useState("");
  const [tipo, setTipo] = useState("");
  const [similares, setSimilares] = useState<
    readonly ReporteSimilarParaCliente[]
  >([]);
  const [pendiente, iniciarTransicion] = useTransition();
  const idDeConsultaRef = useRef(0);

  /**
   * Descarta respuestas fuera de orden: una consulta anterior mas lenta
   * (lugar/tipo ya reemplazados) puede resolver despues de la actual.
   */
  const buscar = (lugarNuevo: string, tipoNuevo: string) => {
    idDeConsultaRef.current += 1;

    if (!lugarNuevo || !tipoNuevo) {
      setSimilares([]);
      return;
    }

    const idDeEstaConsulta = idDeConsultaRef.current;

    iniciarTransicion(async () => {
      const resultado = await buscarSimilaresAction({
        lugarId: lugarNuevo,
        tipo: tipoNuevo,
      });
      if (idDeEstaConsulta !== idDeConsultaRef.current) return;
      setSimilares(resultado.ok ? resultado.data : []);
    });
  };

  const callesDelLugar = calles.filter((calle) => calle.lugarId === lugarId);

  return (
    <div className="flex flex-col gap-4">
      <CampoDeLista
        id="reporte-lugar-id"
        name="lugarId"
        etiqueta="Lugar"
        marcador="Seleccione un lugar"
        opciones={lugares}
        onChange={(evento) => {
          setLugarId(evento.target.value);
          buscar(evento.target.value, tipo);
        }}
      />

      <CampoDeLista
        id="reporte-calle-id"
        name="calleId"
        etiqueta="Calle"
        marcador="Ninguna"
        opcional
        opciones={callesDelLugar}
      />

      <CampoDeLista
        id="reporte-tipo"
        name="tipo"
        etiqueta="Tipo de incidencia"
        marcador="Seleccione un tipo"
        opciones={tipos}
        onChange={(evento) => {
          setTipo(evento.target.value);
          buscar(lugarId, evento.target.value);
        }}
      />

      <ReportesSimilares resultado={similares} pendiente={pendiente} />
    </div>
  );
}
