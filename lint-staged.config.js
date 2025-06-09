/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  "**/*.{js,ts}": (files) => [
    `prettier --write ${files.join(" ")}`,
    "tsc --noEmit",
  ],
  "**/*.{yml,yaml}": (files) => [`prettier --write ${files.join(" ")}`],
};
