import { describe, expect, it } from "vitest";
import { ROLES } from "@/shared/auth/roles";
import {
  estaActivo,
  GRUPOS_DE_MODULOS,
  MODULOS_DEL_PANEL,
  modulosAgrupados,
  modulosDeBarraInferior,
  modulosVisibles,
} from "./modulosDelPanel";

const rutas = (modulos: readonly { ruta: string }[]) =>
  modulos.map((modulo) => modulo.ruta);

describe("modulosDelPanel", () => {
  it("todo modulo pertenece a un grupo declarado", () => {
    for (const modulo of MODULOS_DEL_PANEL) {
      expect(GRUPOS_DE_MODULOS).toContain(modulo.grupo);
    }
  });

  it("agrupa en Atencion, Territorio y Administracion para el administrador", () => {
    const grupos = modulosAgrupados("ADMIN_MUNICIPAL");

    expect(grupos.map((grupo) => grupo.titulo)).toEqual([
      "Atención",
      "Territorio",
      "Administración",
    ]);
    expect(rutas(grupos[0]?.modulos ?? [])).toEqual([
      "/padron",
      "/reportes",
      "/constancias",
    ]);
    expect(rutas(grupos[1]?.modulos ?? [])).toEqual([
      "/territorio",
      "/mapa-operativo",
      "/intervenciones",
    ]);
    expect(rutas(grupos[2]?.modulos ?? [])).toEqual(["/marca"]);
  });

  it.each(ROLES.filter((rol) => rol !== "ADMIN_MUNICIPAL"))(
    "oculta Marca y su grupo vacio para %s",
    (rol) => {
      const grupos = modulosAgrupados(rol);

      expect(grupos.map((grupo) => grupo.titulo)).not.toContain(
        "Administración",
      );
      expect(rutas(modulosVisibles(rol))).not.toContain("/marca");
    },
  );

  it("la barra inferior ofrece hasta cuatro destinos y deja el resto en Mas", () => {
    for (const rol of ROLES) {
      const { principales, resto } = modulosDeBarraInferior(rol);

      expect(principales.length).toBeLessThanOrEqual(4);
      expect([...rutas(principales), ...rutas(resto)].sort()).toEqual(
        rutas(modulosVisibles(rol)).sort(),
      );
    }
  });

  it("el activo respeta el limite de segmento de la ruta", () => {
    expect(estaActivo("/territorio", "/territorio")).toBe(true);
    expect(estaActivo("/territorio/x", "/territorio")).toBe(true);
    expect(estaActivo("/territorio2", "/territorio")).toBe(false);
  });
});
