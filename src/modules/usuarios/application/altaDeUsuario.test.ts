import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { LARGO_MINIMO } from "@/shared/auth/contrasenia";
import type { Rol } from "@/shared/auth/roles";
import { CorreoYaRegistradoError } from "../domain";
import { crearDirectorioDePrueba } from "./directorioDePrueba";

/**
 * S3 y S4 en el caso de uso: el rol se valida antes de escribir, y la clave
 * que el adaptador guarda es la misma que la pantalla va a mostrar. Que esa
 * clave verifique contra el hash lo prueba
 * `altaDeUsuario.integration.test.ts`, contra Postgres.
 */

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearAltaDeUsuario } = await import("./altaDeUsuario");

const contexto = (rol: Rol): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const DATOS = {
  nombre: "Operadora Nueva",
  email: "nueva@motul.example.com",
  rol: "OPERADOR",
};

beforeEach(() => {
  withTenantMock
    .mockReset()
    .mockImplementation((_tenant: string, trabajo: (tx: unknown) => unknown) =>
      trabajo({ transaccion: "de prueba" }),
    );
});

describe("altaDeUsuario", () => {
  it("da de alta en el ayuntamiento del contexto con una clave que devuelve", async () => {
    const directorio = crearDirectorioDePrueba();
    const altaDeUsuario = crearAltaDeUsuario(directorio);

    const alta = await altaDeUsuario(contexto("ADMIN_MUNICIPAL"), DATOS);

    expect(alta.usuarioId).toBe("usuario-nuevo");
    expect(alta.claveTemporal.length).toBeGreaterThanOrEqual(LARGO_MINIMO);
    expect(directorio.altas).toHaveLength(1);
    expect(directorio.altas[0]).toEqual({
      ayuntamientoId: contexto("ADMIN_MUNICIPAL").ayuntamientoId,
      datos: {
        nombre: DATOS.nombre,
        email: DATOS.email,
        rol: "OPERADOR",
        clave: alta.claveTemporal,
      },
    });
  });

  it.each(["OPERADOR", "CONSULTA", "SUPER_ADMIN"] as const)(
    "%s no da de alta a nadie",
    async (rol) => {
      const directorio = crearDirectorioDePrueba();
      const altaDeUsuario = crearAltaDeUsuario(directorio);

      await expect(altaDeUsuario(contexto(rol), DATOS)).rejects.toMatchObject({
        codigo: "NO_AUTORIZADO",
      });
      expect(directorio.altas).toHaveLength(0);
      expect(withTenantMock).not.toHaveBeenCalled();
    },
  );

  it.each(["ADMIN_MUNICIPAL", "SUPER_ADMIN", "Operador", "SECRETARIO", ""])(
    "rechaza el rol %s antes de escribir",
    async (rol) => {
      const directorio = crearDirectorioDePrueba();
      const altaDeUsuario = crearAltaDeUsuario(directorio);

      await expect(
        altaDeUsuario(contexto("ADMIN_MUNICIPAL"), { ...DATOS, rol }),
      ).rejects.toMatchObject({ codigo: "ROL_NO_ASIGNABLE" });
      expect(directorio.altas).toHaveLength(0);
      expect(withTenantMock).not.toHaveBeenCalled();
    },
  );

  it("un correo ya registrado sube como el error propio del modulo", async () => {
    const directorio = crearDirectorioDePrueba();
    const error = new CorreoYaRegistradoError();
    directorio.fallarEnAlta(error);

    await expect(
      crearAltaDeUsuario(directorio)(contexto("ADMIN_MUNICIPAL"), DATOS),
    ).rejects.toBe(error);
  });

  /**
   * A1 de la verificacion de T1: el correo es la credencial de entrada y
   * Better Auth lo busca en minusculas (`internal-adapter.mjs:483-487` en
   * 1.6.29), asi que dos filas que solo difieren en mayusculas son dos
   * cuentas para el indice unico y una sola para el acceso.
   */
  it("normaliza el correo a minusculas antes de escribirlo", async () => {
    const directorio = crearDirectorioDePrueba();

    await crearAltaDeUsuario(directorio)(contexto("ADMIN_MUNICIPAL"), {
      ...DATOS,
      email: "  Nueva@Motul.Example.COM  ",
    });

    expect(directorio.altas[0]?.datos.email).toBe("nueva@motul.example.com");
  });
});
