import type { Metadata } from "next";
import {
  filtrosVisiblesDeDomicilios,
  listarRaices,
  RegistroDeDomicilios,
  registroDeDomicilios,
  TAMANO_DE_PAGINA,
} from "@/modules/territorio";
import type { LugarGuardado } from "@/modules/territorio/application/puertos";
import type { FiltrosDeRegistro } from "@/modules/territorio/application/puertosDeDomicilios";
import { opcionesDeLugares } from "@/modules/territorio/ui/opciones";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import {
  estadoDeLista,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { leerParametros } from "./parametros";

export const metadata: Metadata = { title: "Domicilios" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Ruta fina del registro plano de domicilios (tasks.md A1b-GREEN-02):
 * resuelve el contexto, lista, y compone. Sin guarda de rol propia -leer no
 * es escribir, `listarRaices.ts`-.
 *
 * `listarRaices` alimenta solo el `<select>` del filtro: el registro ya
 * resuelve el subarbol del asentamiento elegido en la consulta paginada.
 * `ayuntamientoId` nunca llega del cliente: lo pone `withTenant` desde el
 * contexto que resuelve `registroDeDomicilios`.
 *
 * La migaja vuelve a `/territorio` (antipatron 26): esta pantalla es un
 * segundo nivel, y sin ella la unica salida era el boton del navegador.
 */
/**
 * Los filtros que dejaron la lista vacia, para el vacio por filtro de
 * `estadoDeLista.ts`: todos, no solo el primero, porque la operadora los
 * puso juntos y cualquiera puede ser el que no encuentra nada.
 */
const filtroVisible = (
  filtros: FiltrosDeRegistro,
  raices: readonly LugarGuardado[],
): string | undefined =>
  filtrosVisiblesDeDomicilios(
    filtros,
    (id) => raices.find((raiz) => raiz.id === id)?.nombre,
  )
    .map((filtro) => filtro.etiqueta)
    .join(", ");

export default async function PaginaDeDomicilios({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { filtros, limite } = leerParametros(await searchParams);
  const raices = await listarRaices(contexto);
  const { domicilios, hayMas } = await registroDeDomicilios(
    filtros,
    contexto,
    limite ?? TAMANO_DE_PAGINA,
  );
  const estado = estadoDeLista({
    total: domicilios.length,
    filtro: filtroVisible(filtros, raices),
  });

  return (
    <PaginaDePanel
      titulo="Domicilios"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Territorio", href: "/territorio" },
            { etiqueta: "Domicilios" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      <RegistroDeDomicilios
        domicilios={domicilios}
        hayMas={hayMas}
        estadoDeLista={estado}
        filtros={filtros}
        limite={limite}
        raices={opcionesDeLugares(raices)}
        puedeCrear={puedeEscribir(contexto.usuario.rol)}
      />
    </PaginaDePanel>
  );
}
