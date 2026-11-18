import { FileText } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdministrarPersona,
  FichaDePersona,
  nombreCompletoDe,
  PESTANA_POR_DEFECTO,
  PestanasDeFicha,
} from "@/modules/padron";
import {
  HistorialDeResidencias,
  historialDeResidencias,
  listarDomicilios,
  RegistroDeMudanza,
} from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  EnlaceDeAccion,
  Migaja,
  PantallaDeMensaje,
} from "@/shared/ui";
import {
  candidatosAFusionar,
  domicilioVigenteDe,
  leerParametrosDeFicha,
  leerPersona,
} from "./parametros";

export const metadata: Metadata = { title: "Persona" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Unica ruta que compone `padron` y `territorio` (design.md seccion 11,
 * "Composicion de pantallas"). La dependencia entre modulos es de un solo
 * sentido: `territorio/infrastructure/lectorDePersonasPorPadron.ts` importa
 * el barrel de `padron` (puerto propio + adaptador, design.md seccion 6),
 * pero `padron` nunca importa `territorio` -esa arista no existe, y es lo
 * que `sin-ciclos` en `.dependency-cruiser.cjs` hace cumplir-. Esta pagina
 * no repite esa arista: solo necesita leer de los dos barrels para
 * mostrarlos juntos, algo que ningun modulo podria hacer sin crear una
 * dependencia permanente entre ellos.
 *
 * La lectura de la URL y la resolucion de lo que la pantalla necesita viven
 * en `parametros.ts` (metrica de 200 lineas, y el corte cae por tema).
 */
export default async function PaginaDeDetalleDePersona({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { id } = await params;
  const parametros = leerParametrosDeFicha(await searchParams);
  const persona = await leerPersona(id, contexto);

  if (!persona) notFound();

  const puedeActuar = puedeEscribir(contexto.usuario.rol);
  // Sin permiso de escritura no hay nada que administrar: un `?pestana=`
  // pegado a mano no abre una pestaña que la sesion no puede usar.
  const pestana = puedeActuar ? parametros.pestana : PESTANA_POR_DEFECTO;
  const nombre = nombreCompletoDe(persona);
  const historial = await historialDeResidencias(persona.id, contexto);
  // `listar` no tiene LIMIT: solo se paga cuando la cabecera pinta la mudanza.
  const domicilios = puedeActuar ? await listarDomicilios(contexto) : [];
  const candidatos = await candidatosAFusionar({
    pestana,
    nombre,
    personaId: persona.id,
    contexto,
  });
  // El id llega en la URL: solo se preselecciona si es un domicilio que el
  // municipio ya devolvio bajo su tenant. Otro id se ignora sin error.
  const domicilioPreseleccionado = domicilios.find(
    (domicilio) => domicilio.id === parametros.domicilio,
  )?.id;
  const domicilioRecienCreado =
    !parametros.error && parametros.ok === "domicilio-creado";

  return (
    <FichaDePersona
      nombre={nombre}
      curp={persona.curp}
      domicilioVigente={domicilioVigenteDe(historial)}
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Padrón", href: "/padron" },
            { etiqueta: nombre },
          ]}
          etiqueta="Ruta"
        />
      }
      acciones={
        puedeActuar ? (
          <EnlaceDeAccion
            href={`/constancias/emitir?personaId=${persona.id}`}
            variante="primaria"
          >
            <FileText size={18} aria-hidden="true" />
            Emitir constancia
          </EnlaceDeAccion>
        ) : undefined
      }
      mudanza={
        puedeActuar ? (
          <RegistroDeMudanza
            personaId={persona.id}
            domicilios={domicilios}
            sinHistorial={historial.length === 0}
            domicilioRecienCreado={domicilioRecienCreado}
            {...(domicilioPreseleccionado ? { domicilioPreseleccionado } : {})}
          />
        ) : undefined
      }
      abrirMudanza={historial.length === 0 || domicilioRecienCreado}
    >
      {parametros.error ? <Aviso tono="error">{parametros.error}</Aviso> : null}

      {puedeActuar ? null : (
        <AvisoDePermiso
          capacidad="registrar cambios en el padrón ni emitir constancias"
          requisito="un rol con permisos de escritura"
        />
      )}

      <div className="flex flex-col gap-4">
        <PestanasDeFicha
          personaId={persona.id}
          activa={pestana}
          puedeAdministrar={puedeActuar}
        />
        {pestana === "administrar" ? (
          <AdministrarPersona
            persona={persona}
            contexto={contexto}
            candidatos={candidatos}
          />
        ) : (
          <section className="flex flex-col gap-3">
            <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
              Historial de residencias
            </h2>
            <HistorialDeResidencias historial={historial} />
            <p className="text-[15px] text-caliza-apagada">
              La residencia vigente es la que se imprime en las constancias.
            </p>
          </section>
        )}
      </div>
    </FichaDePersona>
  );
}
