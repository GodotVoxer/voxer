import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const layer = (name) => [`@/${name}/*`, `**/${name}/*`];

/** Each layer may only import from the layers listed in docs/architecture.md. */
const boundary = (files, forbidden) => ({
  files,
  // Tests may cross layers to assert that values shared between them stay in sync.
  ignores: ["**/*.test.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: forbidden.map((name) => ({
          group: layer(name),
          message: `This layer must not import from ${name}/ (see docs/architecture.md).`,
        })),
      },
    ],
  },
});

const eslintConfig = [
  { ignores: ["android/**", "realtime/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["components/ui/**"],
    rules: {
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: {
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "import/first": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
    },
  },
  boundary(["lib/**"], ["server", "features", "hooks", "components", "app", "mocks"]),
  boundary(["server/**"], ["features", "hooks", "components", "app"]),
  boundary(["features/**"], ["server", "hooks", "components", "app"]),
  boundary(["hooks/**"], ["server", "components", "app"]),
  boundary(["components/**"], ["server", "app"]),
  eslintConfigPrettier,
];

export default eslintConfig;
