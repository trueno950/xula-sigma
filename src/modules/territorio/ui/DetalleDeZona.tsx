import type { ColumnaDeTabla } from "@/shared/ui";
import {
  Aviso,
  CeldaPrincipal,
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
import {
  type CalleParaZona,
  FormularioDeBajaDeZona,
  FormularioDePertenenciaDeCalle,
  FormularioDeQuitarCalleDeZona,
  FormularioDeRenombreDeZona,
} from "./FormulariosDeZona";

const COLUMNAS_DE_CALLES: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
  { clave: "quitar", etiqueta: "Acciones" },
];

const COLUMNAS_DE_DOMICILIOS: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
  { clave: "numero", etiqueta: "Número" },
  { clave: "asentamiento", etiqueta: "Asentamiento" },
];

type Props = {
  zona: ZonaGuardada;
  vista: "calles" | "domicilios";
  calles: readonly CalleParaZona[];
  domicilios: readonly DomicilioDelRegistro[];
  callesDelAsentamiento: readonly CalleParaZona[];
  error: string | undefined;
  aviso: string | undefined;
};

/**
 * El detalle de una zona: pestanas de URL (`?zona=&vista=`) con las calles
 * que la componen y los domicilios derivados de esas calles, nunca
 * declarados aparte (Rebanada B1). Renombre, baja y pertenencias son
 * formularios nativos; la zona no se elige por cliente, ya esta en la URL.
 */
export function DetalleDeZona({
  zona,
  vista,
  calles,
  domicilios,
  callesDelAsentamiento,
  error,
  aviso,
}: Props) {
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
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}

      <div className="flex flex-wrap items-end gap-4">
        <FormularioDeRenombreDeZona zonaId={zona.id} nombre={zona.nombre} />
        <FormularioDeBajaDeZona zonaId={zona.id} />
      </div>

      <Pestanas pestanas={pestanas} etiqueta="Vistas de la zona" />
      {vista === "calles" ? (
        <CallesDeLaZona
          zonaId={zona.id}
          calles={calles}
          callesDelAsentamiento={callesDelAsentamiento}
        />
      ) : (
        <DomiciliosDeLaZona domicilios={domicilios} />
      )}
    </PaginaDePanel>
  );
}

function CallesDeLaZona({
  zonaId,
  calles,
  callesDelAsentamiento,
}: {
  zonaId: ZonaGuardada["id"];
  calles: readonly CalleParaZona[];
  callesDelAsentamiento: readonly CalleParaZona[];
}) {
  const fuera = callesDelAsentamiento.filter(
    (calle) => !calles.some((enZona) => enZona.id === calle.id),
  );

  return (
    <>
      {fuera.length > 0 ? (
        <FormularioDePertenenciaDeCalle zonaId={zonaId} calles={fuera} />
      ) : null}
      {calles.length === 0 ? (
        <EstadoVacio
          estado={{ clase: "vacio-inicial" }}
          mensajeInicial="La zona no tiene calles todavía. Una zona sin calles no deriva domicilios."
          hrefSinFiltro={`/territorio/zonas?zona=${zonaId}`}
        />
      ) : (
        <Tabla etiqueta="Calles de la zona" columnas={COLUMNAS_DE_CALLES}>
          {calles.map((calle) => (
            <FilaDeTabla key={calle.id} etiquetaAccesible={calle.nombre}>
              <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
              <CeldaPrincipal>
                <FormularioDeQuitarCalleDeZona
                  zonaId={zonaId}
                  calleId={calle.id}
                />
              </CeldaPrincipal>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </>
  );
}

function DomiciliosDeLaZona({
  domicilios,
}: {
  domicilios: readonly DomicilioDelRegistro[];
}) {
  if (domicilios.length === 0) {
    return (
      <EstadoVacio
        estado={{ clase: "vacio-inicial" }}
        mensajeInicial="La zona todavía no deriva domicilios de sus calles."
        hrefSinFiltro="/territorio/zonas"
      />
    );
  }

  return (
    <Tabla etiqueta="Domicilios derivados" columnas={COLUMNAS_DE_DOMICILIOS}>
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
  );
}
