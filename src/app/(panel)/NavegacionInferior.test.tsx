import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Rol } from "@/shared/auth/roles";

const pathnameMock = vi.hoisted(() => vi.fn((): string | null => null));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));

import { NavegacionInferior } from "./NavegacionInferior";

const pintar = (rol: Rol, ruta: string) =>
  renderToStaticMarkup(
    <NavegacionInferior ruta={ruta} rol={rol}>
      <p>pie</p>
    </NavegacionInferior>,
  );

describe("NavegacionInferior", () => {
  beforeEach(() => pathnameMock.mockReset().mockReturnValue(null));

  it("el activo sigue a usePathname y no a la ruta inicial", () => {
    pathnameMock.mockReturnValue("/reportes");

    const html = pintar("ADMIN_MUNICIPAL", "/padron");
    const activo = html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0];

    expect(activo).toContain('href="/reportes"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("cada destino lleva icono y texto", () => {
    const html = pintar("ADMIN_MUNICIPAL", "/padron");

    for (const nombre of ["Padrón", "Reportes", "Constancias", "Territorio"]) {
      expect(html).toContain(nombre);
    }
    expect(html).toContain("Más");
    expect(html.match(/<svg/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("marca el destino activo con aria-current", () => {
    const html = pintar("ADMIN_MUNICIPAL", "/territorio/lugares");

    expect(html.match(/<a[^>]*aria-current="page"[^>]*>/)?.[0]).toContain(
      'href="/territorio"',
    );
  });

  it("deja el resto de modulos y el pie dentro de Mas", () => {
    const html = pintar("ADMIN_MUNICIPAL", "/padron");
    const mas = html.slice(html.indexOf("<details"));

    expect(mas).toContain('href="/mapa-operativo"');
    expect(mas).toContain('href="/intervenciones"');
    expect(mas).toContain('href="/marca"');
    expect(mas).toContain("pie");
  });

  it("no ofrece un modulo que el rol no puede usar", () => {
    expect(pintar("CONSULTA", "/padron")).not.toContain('href="/marca"');
  });

  it("respeta el area segura inferior del dispositivo", () => {
    const barra = pintar("ADMIN_MUNICIPAL", "/padron").match(/<nav[^>]*>/)?.[0];

    expect(barra).toContain("pb-[env(safe-area-inset-bottom)]");
  });
});
