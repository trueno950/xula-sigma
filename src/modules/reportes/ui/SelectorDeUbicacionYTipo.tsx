"use client";

import { useRef, useState, useTransition } from "react";
import {
  CampoDeLista,
  type OpcionDeLista,
  SelectorDeDireccion,
} from "@/shared/ui";
import {
  buscarDireccionesAction,
  type DireccionParaReporte,
} from "./actions/buscarDireccionesAction";
import {
  buscarSimilaresAction,
  type ReporteSimilarParaCliente,
} from "./actions/buscarSimilaresAction";
import { ReportesSimilares } from "./ReportesSimilares";

export type OpcionDeCalle = OpcionDeLista & { lugarId: string };
type ModoDeUbicacion = "lugar" | "domicilio";

type Props = {
  lugares: readonly OpcionDeLista[];
  calles: readonly OpcionDeCalle[];
  tipos: readonly OpcionDeLista[];
};

/** Isla de selección: las listas nativas siguen enviándose en el POST del formulario padre. */
export function SelectorDeUbicacionYTipo({ lugares, calles, tipos }: Props) {
  const [modo, setModo] = useState<ModoDeUbicacion>("lugar");
  const [lugarId, setLugarId] = useState("");
  const [direccion, setDireccion] = useState<DireccionParaReporte | null>(null);
  const [tipo, setTipo] = useState("");
  const [similares, setSimilares] = useState<
    readonly ReporteSimilarParaCliente[]
  >([]);
  const [pendiente, iniciarTransicion] = useTransition();
  const idDeConsultaRef = useRef(0);

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

  const cambiarModo = (modoNuevo: ModoDeUbicacion) => {
    setModo(modoNuevo);
    setLugarId("");
    setDireccion(null);
    buscar("", tipo);
  };

  const nombresDeLugar = new Map(
    lugares.map((lugar) => [lugar.valor, lugar.etiqueta]),
  );
  const callesDelLugar = lugarId
    ? calles.filter((calle) => calle.lugarId === lugarId)
    : calles.map((calle) => ({
        ...calle,
        etiqueta: `${calle.etiqueta} — ${nombresDeLugar.get(calle.lugarId) ?? "Su asentamiento"}`,
      }));

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-medium leading-tight text-caliza-apagada">
          Forma de indicar la ubicación
        </legend>
        <label className="flex min-h-11 items-center gap-2 text-[15px] text-caliza-tinta">
          <input
            type="radio"
            name="modoUbicacion"
            value="lugar"
            checked={modo === "lugar"}
            onChange={() => cambiarModo("lugar")}
          />
          Lugar y calle
        </label>
        <label className="flex min-h-11 items-center gap-2 text-[15px] text-caliza-tinta">
          <input
            type="radio"
            name="modoUbicacion"
            value="domicilio"
            checked={modo === "domicilio"}
            onChange={() => cambiarModo("domicilio")}
          />
          Domicilio registrado
        </label>
      </fieldset>

      {modo === "lugar" ? (
        <>
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
            key={lugarId}
            id="reporte-calle-id"
            name="calleId"
            etiqueta="Calle"
            marcador="Ninguna"
            opcional
            opciones={callesDelLugar}
          />
        </>
      ) : (
        <SelectorDeDireccion<DireccionParaReporte>
          id="reporte-direccion"
          nombre="domicilioId"
          buscar={buscarDireccionesAction}
          onSeleccionar={(seleccionada) => {
            setDireccion(seleccionada);
            buscar(seleccionada?.lugarId ?? "", tipo);
          }}
        />
      )}

      <CampoDeLista
        id="reporte-tipo"
        name="tipo"
        etiqueta="Tipo de incidencia"
        marcador="Seleccione un tipo"
        opciones={tipos}
        onChange={(evento) => {
          const tipoNuevo = evento.target.value;
          setTipo(tipoNuevo);
          buscar(
            modo === "domicilio" ? (direccion?.lugarId ?? "") : lugarId,
            tipoNuevo,
          );
        }}
      />

      <ReportesSimilares resultado={similares} pendiente={pendiente} />
    </div>
  );
}
