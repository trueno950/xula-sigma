import {
  listarRaices,
  RegistroDeDomicilios,
  registroDeDomicilios,
  TAMANO_DE_PAGINA,
} from "@/modules/territorio";
import type { LugarGuardado } from "@/modules/territorio/application/puertos";
import type { FiltrosDeRegistro } from "@/modules/territorio/application/puertosDeDomicilios";
import { opcionesDeLugares } from "@/modules/territorio/ui/opciones";
import { contextoActual } from "@/shared/auth";
import {
  estadoDeLista,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { leerParametros } from "./parametros";

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
 * Que filtro dejo la lista vacia, para el vacio por filtro de
 * `estadoDeLista.ts`. El asentamiento entra por su nombre y no por su id:
 * `EstadoVacio` lo escribe tal cual en "Sin resultados para X", y un uuid
 * ahi no le dice nada a la operadora.
 */
const filtroVisible = (
  filtros: FiltrosDeRegistro,
  raices: readonly LugarGuardado[],
): string | undefined =>
  filtros.calle ??
  filtros.numero ??
  raices.find((raiz) => raiz.id === filtros.raizId)?.nombre;

export default async function PaginaDeDomicilios({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
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
      />
    </PaginaDePanel>
  );
}
