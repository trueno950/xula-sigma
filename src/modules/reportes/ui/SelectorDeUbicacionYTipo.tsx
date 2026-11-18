"use client";

import { useRef, useState, useTransition } from "react";
import {
  CampoDeLista,
  CLASES_DE_ETIQUETA,
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

const MODOS: readonly {
  valor: ModoDeUbicacion;
  etiqueta: string;
  explicacion: string;
}[] = [
  {
    valor: "lugar",
    etiqueta: "Lugar y calle",
    explicacion: "Elija el lugar y, si la sabe, la calle.",
  },
  {
    valor: "domicilio",
    etiqueta: "Domicilio registrado",
    explicacion: "Busque una dirección del padrón territorial.",
  },
];

type Props = {
  lugares: readonly OpcionDeLista[];
  calles: readonly OpcionDeCalle[];
  tipos: readonly OpcionDeLista[];
};

type PropsDeOpcion = {
  modo: (typeof MODOS)[number];
  elegido: boolean;
  onElegir: (modo: ModoDeUbicacion) => void;
};

/**
 * La explicacion va fuera de la etiqueta porque el nombre accesible de la
 * opcion tiene que seguir siendo el titulo solo: `e2e/direccionDeReporte.spec.ts`
 * la marca por su texto exacto.
 */
function OpcionDeModo({ modo, elegido, onElegir }: PropsDeOpcion) {
  const idDeAyuda = `reporte-modo-${modo.valor}-ayuda`;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-11 items-center gap-2 text-[15px] text-caliza-tinta">
        <input
          type="radio"
          name="modoUbicacion"
          value={modo.valor}
          checked={elegido}
          onChange={() => onElegir(modo.valor)}
          aria-describedby={idDeAyuda}
        />
        {modo.etiqueta}
      </label>
      <p id={idDeAyuda} className={`${CLASES_DE_ETIQUETA} pl-6`}>
        {modo.explicacion}
      </p>
    </div>
  );
}

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
  /**
   * Sin lugar elegido la calle lista las de todos los asentamientos, cada
   * una con el suyo: es el camino que sigue funcionando sin JavaScript.
   */
  const callesDelLugar = lugarId
    ? calles.filter((calle) => calle.lugarId === lugarId)
    : calles.map((calle) => ({
        ...calle,
        etiqueta: `${calle.etiqueta} — ${nombresDeLugar.get(calle.lugarId) ?? "Su asentamiento"}`,
      }));

  return (
    <div className="flex flex-col gap-4">
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

      <fieldset className="flex flex-col gap-3">
        <legend className="text-[13px] font-medium leading-tight text-caliza-apagada">
          Forma de indicar la ubicación
        </legend>
        {MODOS.map((opcion) => (
          <OpcionDeModo
            key={opcion.valor}
            modo={opcion}
            elegido={modo === opcion.valor}
            onElegir={cambiarModo}
          />
        ))}
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
            marcador={lugarId ? "Ninguna" : "Elija primero el lugar"}
            opcional
            opciones={callesDelLugar}
          />
        </>
      ) : (
        <SelectorDeDireccion<DireccionParaReporte>
          id="reporte-direccion"
          nombre="domicilioId"
          etiquetaDeLista="Dirección para el reporte"
          alternativa="Puede indicar lugar y calle."
          buscar={buscarDireccionesAction}
          onSeleccionar={(seleccionada) => {
            setDireccion(seleccionada);
            buscar(seleccionada?.lugarId ?? "", tipo);
          }}
        />
      )}

      <ReportesSimilares resultado={similares} pendiente={pendiente} />
    </div>
  );
}
