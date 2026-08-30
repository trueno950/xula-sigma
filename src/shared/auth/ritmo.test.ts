import { describe, expect, it } from "vitest";
import { claveDe, LIMITES, superaElLimite, VENTANA_MINUTOS } from "./ritmo";

/**
 * Lo que se puede verificar sin base: la clave que se guarda y la regla del
 * limite. La ventana corrediza en si la cuenta Postgres, y su test vive en
 * `ritmo.isolation.test.ts`.
 */

describe("claveDe", () => {
  it("no devuelve el valor en claro ni nada que se le parezca", () => {
    /**
     * Es la afirmacion central de la tabla `intentos_acceso`: es un contador,
     * no un registro de quien intento entrar. Si el correo apareciera —entero
     * o en pedazos— la tabla pasaria a ser una lista de quien tiene cuenta en
     * cada municipio.
     */
    const clave = claveDe("tesoreria@example.com");

    expect(clave).not.toContain("tesoreria");
    expect(clave).not.toContain("example.com");
    expect(clave).toMatch(/^[0-9a-f]{64}$/);
  });

  it("el mismo valor da siempre la misma clave", () => {
    // Sin esto no hay ventana: cada intento abriria su propio contador.
    expect(claveDe("alguien@example.com")).toBe(claveDe("alguien@example.com"));
  });

  it("valores distintos dan claves distintas", () => {
    expect(claveDe("una@example.com")).not.toBe(claveDe("otra@example.com"));
  });

  it("normaliza mayusculas y espacios", () => {
    /**
     * Sin normalizar, `Juan@X.com` y `juan@x.com` abren dos ventanas para la
     * misma cuenta, y probar seis variantes de mayusculas multiplica el
     * limite por seis. El correo es insensible a mayusculas del lado del
     * dominio y en la practica tambien del lado local.
     */
    const canonica = claveDe("juan@example.com");

    expect(claveDe("  Juan@Example.com  ")).toBe(canonica);
    expect(claveDe("JUAN@EXAMPLE.COM")).toBe(canonica);
  });

  it("una IP no colisiona con un correo que se le parezca", () => {
    expect(claveDe("192.168.1.1")).not.toBe(claveDe("192.168.1.10"));
  });
});

describe("superaElLimite", () => {
  it("deja pasar mientras el conteo este por debajo", () => {
    expect(superaElLimite("correo", LIMITES.correo - 1)).toBe(false);
    expect(superaElLimite("ip", LIMITES.ip - 1)).toBe(false);
  });

  it("corta al llegar al limite, no despues", () => {
    /**
     * El conteo que se pasa es el de intentos **previos**. Cortar en
     * `> limite` en vez de `>=` regalaria un intento gratis por ventana, que
     * es justo el margen que aprovecha quien prueba contrasenias.
     */
    expect(superaElLimite("correo", LIMITES.correo)).toBe(true);
    expect(superaElLimite("ip", LIMITES.ip)).toBe(true);
  });

  it("las dos ventanas se cuentan por separado", () => {
    // 20 intentos desde una IP no agotan la ventana de un correo, y al
    // reves. Contarlas juntas dejaria a un municipio entero afuera porque
    // todos salen por la misma IP del palacio.
    expect(superaElLimite("correo", LIMITES.correo)).toBe(true);
    expect(superaElLimite("ip", LIMITES.correo)).toBe(false);
  });
});

describe("los limites del diseno", () => {
  it("son 5 por correo, 20 por IP y 30 por folio, en 15 minutos", () => {
    /**
     * Estan aca escritos como assert y no solo como constante porque son una
     * decision, no un detalle: 5 por correo frena la prueba de contrasenias
     * sin dejar afuera a quien se equivoca dos veces, y 20 por IP tolera que
     * el palacio entero salga por una sola conexion. 30 por folio es un poco
     * mas alto que el de IP a proposito: una institucion validando un lote
     * de documentos tiene la forma legitima del enumerador, y quien agota
     * esa ventana no obtuvo ningun dato personal -sin codigo correcto no hay
     * titular ni direccion que raspar- (design.md de `constancias-oficios`,
     * seccion 12).
     */
    expect(LIMITES).toEqual({ correo: 5, ip: 20, folio: 30 });
    expect(VENTANA_MINUTOS).toBe(15);
  });
});
