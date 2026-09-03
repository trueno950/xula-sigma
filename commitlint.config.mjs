/**
 * Conventional commits en espanol, sin atribucion de IA.
 * Ver docs/02-nomenclatura.md.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "test", "docs", "refactor", "chore", "perf"],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "padron",
        "constancias",
        "reportes",
        "apoyos",
        "operacion",
        "campanias",
        "juzgado",
        "portal",
        "territorio",
        "tenancy",
        "auth",
        "ui",
        "arquitectura",
        "ci",
        "deps",
      ],
    ],
    "scope-empty": [2, "never"],
    "subject-case": [0],
    "header-max-length": [2, "always", 72],
  },
};
