import { execFileSync } from "node:child_process";

let psqlNativo: boolean | null = null;

const hayPsqlNativo = () => {
  if (psqlNativo !== null) return psqlNativo;
  try {
    execFileSync("psql", ["--version"], { stdio: "ignore" });
    psqlNativo = true;
  } catch {
    psqlNativo = false;
  }
  return psqlNativo;
};

// CI tiene psql nativo; el host local usa el cliente del contenedor.
const comandoPsql = (databaseUrl: string): [string, string[]] =>
  hayPsqlNativo()
    ? ["psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1"]]
    : [
        "docker",
        [
          "exec",
          "-i",
          "xula-pg",
          "psql",
          databaseUrl.replace(":55432", ":5432"),
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
        ],
      ];

type ComandoDePrueba = { databaseUrl: string; entrada: string };

export const ejecutarPsql = (opciones: ComandoDePrueba): string => {
  const [comando, argumentos] = comandoPsql(opciones.databaseUrl);
  return execFileSync(comando, argumentos, {
    input: opciones.entrada,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
};

export const ejecutarPsqlFallido = (opciones: ComandoDePrueba): string => {
  try {
    ejecutarPsql(opciones);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const salida = error as Error & { stdout?: string; stderr?: string };
    return `${salida.stdout ?? ""}${salida.stderr ?? ""}`;
  }
  throw new Error("El comando psql debio fallar y no fallo.");
};
