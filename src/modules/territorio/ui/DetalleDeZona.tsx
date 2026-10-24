import {
  CeldaPrincipal,
  type ColumnaDeTabla,
  EstadoVacio,
  FilaDeTabla,
  Migaja,
  PaginaDePanel,
  type Pestana,
  Pestanas,
  Tabla,
} from "@/shared/ui";
import type { DomicilioDelRegistro } from "../application/puertosDeDomicilios";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";

type CalleDeZona = { id: string; nombre: string };

const COLUMNAS_DE_CALLES: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
];

const COLUMNAS_DE_DOMICILIOS: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
  { clave: "numero", etiqueta: "Número" },
  { clave: "asentamiento", etiqueta: "Asentamiento" },
];

type Props = {
  zona: ZonaGuardada;
  vista: "calles" | "domicilios";
  calles: readonly CalleDeZona[];
  domicilios: readonly DomicilioDelRegistro[];
};

/**
 * El detalle de una zona: pestanas de URL (`?zona=&vista=`) con las calles
 * que la componen y los domicilios derivados de esas calles, nunca
 * declarados aparte (Rebanada B1).
 */
export function DetalleDeZona({ zona, vista, calles, domicilios }: Props) {
  const base = `/territorio/zonas?zona=${zona.id}`;
  const pestanas: readonly Pestana[] = [
    {
      clave: "calles",
      etiqueta: "Calles",
      href: `${base}&vista=calles`,
      activa: vista === "calles",
      cuenta: calles.length,
      etiquetaAccesible: `Calles de la zona, ${calles.length}`,
    },
    {
      clave: "domicilios",
      etiqueta: "Domicilios",
      href: `${base}&vista=domicilios`,
      activa: vista === "domicilios",
      cuenta: domicilios.length,
      etiquetaAccesible: `Domicilios derivados, ${domicilios.length}`,
    },
  ];

  return (
    <PaginaDePanel
      titulo={zona.nombre}
      etiqueta="Zona"
      descripcion={`Zona operativa de ${zona.asentamiento}.`}
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Territorio", href: "/territorio" },
            { etiqueta: "Zonas", href: "/territorio/zonas" },
            { etiqueta: zona.nombre },
          ]}
          etiqueta="Camino a la zona"
        />
      }
    >
      <Pestanas pestanas={pestanas} etiqueta="Vistas de la zona" />
      {vista === "calles" ? (
        calles.length === 0 ? (
          <EstadoVacio
            estado={{ clase: "vacio-inicial" }}
            mensajeInicial="La zona no tiene calles todavía. Una zona sin calles no deriva domicilios."
            hrefSinFiltro={base}
          />
        ) : (
          <Tabla etiqueta="Calles de la zona" columnas={COLUMNAS_DE_CALLES}>
            {calles.map((calle) => (
              <FilaDeTabla key={calle.id} etiquetaAccesible={calle.nombre}>
                <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
              </FilaDeTabla>
            ))}
          </Tabla>
        )
      ) : domicilios.length === 0 ? (
        <EstadoVacio
          estado={{ clase: "vacio-inicial" }}
          mensajeInicial="La zona todavía no deriva domicilios de sus calles."
          hrefSinFiltro={base}
        />
      ) : (
        <Tabla
          etiqueta="Domicilios derivados"
          columnas={COLUMNAS_DE_DOMICILIOS}
        >
          {domicilios.map((domicilio) => (
            <FilaDeTabla
              key={domicilio.id}
              etiquetaAccesible={`${domicilio.calle} ${domicilio.numero}, ${domicilio.lugar}`}
            >
              <CeldaPrincipal>{domicilio.calle}</CeldaPrincipal>
              <CeldaPrincipal>{domicilio.numero}</CeldaPrincipal>
              <CeldaPrincipal>{domicilio.lugar}</CeldaPrincipal>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </PaginaDePanel>
  );
}
