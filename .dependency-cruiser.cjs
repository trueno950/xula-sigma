/**
 * Limites de capa de XULA SIGMA.
 *
 * ui ──► application ──► domain ◄── infrastructure
 *
 * Estas reglas no son convencion: rompen el build.
 * Ver docs/architecture/estructura.md seccion 3.
 */
module.exports = {
  forbidden: [
    {
      name: "dominio-no-importa-nada",
      severity: "error",
      comment:
        "domain es logica de negocio pura. No importa Drizzle, ni Next, ni React, " +
        "ni otra capa, ni shared. Solo a si mismo. Es lo que permite testearlo en " +
        "milisegundos sin base de datos.",
      from: { path: "^src/modules/([^/]+)/domain/" },
      to: { pathNot: "^src/modules/$1/domain/" },
    },
    {
      name: "application-no-importa-infra-ni-ui",
      severity: "error",
      comment:
        "application define puertos; infrastructure los implementa. El caso de uso " +
        "no sabe si detras hay Postgres, un archivo o un mock.",
      from: { path: "^src/modules/[^/]+/application/" },
      to: { path: "^src/modules/[^/]+/(infrastructure|ui)/" },
    },
    {
      name: "infrastructure-no-importa-ui",
      severity: "error",
      from: { path: "^src/modules/[^/]+/infrastructure/" },
      to: { path: "^src/modules/[^/]+/ui/" },
    },
    {
      name: "ui-no-importa-infrastructure",
      severity: "error",
      comment:
        "Un componente no abre transacciones ni toca repositorios. Pide al caso de uso.",
      from: { path: "^src/modules/[^/]+/ui/" },
      to: { path: "^src/modules/[^/]+/infrastructure/" },
    },
    {
      name: "modulo-no-importa-interior-de-otro",
      severity: "error",
      comment:
        "Un modulo consume otro solo por su index.ts. Si apoyos necesita datos de " +
        "padron, declara un puerto en su propio dominio.",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/([^/]+)/",
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/index\\.(ts|tsx)$"],
      },
    },
    {
      name: "shared-no-importa-modulos",
      severity: "error",
      comment:
        "shared es transversal. Si depende de un modulo, deja de ser compartido.",
      from: { path: "^src/shared/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "app-no-importa-infrastructure",
      severity: "error",
      comment:
        "src/app es routing y composicion. Si una ruta abre base de datos, esta mal ubicada.",
      from: { path: "^src/app/" },
      to: { path: "^src/modules/[^/]+/(infrastructure|domain)/" },
    },
    {
      name: "auth-solo-desde-shared-auth",
      severity: "error",
      comment:
        "better-auth y @node-rs/argon2 solo se importan desde src/shared/auth. " +
        "Es la primera de las tres capas que sostienen el aislamiento (diseno " +
        "seccion 1): un import de better-auth en otro lado construiria una " +
        "instancia fuera de manejarAuth, o sea fuera de withTenant, y ahi el " +
        "SELECT por correo de sign-up.mjs:166 correria sin app.tenant fijado. " +
        "Un comentario no lo impide; esto rompe el build.",
      from: { pathNot: "^src/shared/auth/" },
      // Se compara contra `resolved`, que con pnpm es
      // `node_modules/.pnpm/@node-rs+argon2@2.1.0/node_modules/@node-rs/argon2/…`.
      // Un patron anclado al nombre del paquete (`^@node-rs/argon2`) no
      // matchea nunca y la regla queda decorativa: se comprobo provocandola.
      to: {
        dependencyTypes: ["npm"],
        path: "node_modules/(better-auth|@node-rs/argon2)/",
      },
    },
    {
      name: "sin-ciclos",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "sin-dependencias-fantasma",
      severity: "error",
      comment: "Se importa algo que no esta declarado en package.json.",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
