import { SKIP, visit } from "unist-util-visit";
import { slug as githubSlug } from "github-slugger";

/**
 * @typedef {import('./index').RehypeSlugLinkOptions} RehypeSlugLinkOptions
 * @typedef {import('./index').MissingCaptureGroupHandling} MissingCaptureGroupHandling
 * @typedef {import('./index').InvalidSlugHandling} InvalidSlugHandling
 * @typedef {import('unified').Transformer<import('hast').Root, import('hast').Root>} UnifiedTransformer
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Nodes} HastNodes
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').Text} HastText
 */

/**
 * Plugin options with deprecated names resolved and defaults applied.
 * @typedef {Object} ResolvedOptions
 * @property {RegExp} pattern
 * @property {MissingCaptureGroupHandling} missingCaptureGroupHandling
 * @property {boolean} fallbackToHeadingText
 * @property {InvalidSlugHandling} invalidSlugHandling
 * @property {boolean} maintainCase
 * @property {boolean} normalizeUnicode
 */

/**
 * A heading that can be linked to.
 * @typedef {Object} Heading
 * @property {HastElement} node
 * @property {string} id
 * @property {string | undefined} label - Link text, computed once all links exist
 */

/**
 * Lookup tables over the headings of one document. Each maps a key to the
 * first heading (in document order) with that key.
 * @typedef {Object} HeadingIndex
 * @property {Map<string, Heading>} byId - Exact id
 * @property {Map<string, Heading>} byText - Whitespace-collapsed heading text
 * @property {Map<string, Heading>} byNormalizedId - Normalized, lower-cased id (normalizeUnicode only)
 * @property {Map<string, Heading>} byNormalizedText - Normalized, lower-cased text (normalizeUnicode only)
 */

const PACKAGE = "rehype-slug-link";

const HEADING_PATTERN = /^h[1-6]$/;
const DEFAULT_PATTERN = /\[\{#([^}]+)\}\]/g;

/** Characters allowed in a slug (ASCII letters, digits, `_`, `-`, and U+00C0–U+FFFF). */
const VALID_SLUG = /^[a-zA-Z0-9_\-À-￿]+$/;

/**
 * Elements whose content is never rewritten: existing links (nesting an `<a>`
 * inside another is invalid), code-like elements (they show the syntax
 * literally), and elements with raw or non-HTML content.
 */
const SKIPPED_ELEMENTS = new Set([
  "a",
  "code",
  "kbd",
  "math",
  "pre",
  "samp",
  "script",
  "style",
  "svg",
  "template",
  "textarea",
  "title",
]);

const WHITESPACE_RUN = /\s+/g;

/**
 * Rehype plugin that converts link syntax to heading links.
 *
 * @param {RehypeSlugLinkOptions | null} [options={}] - Plugin configuration
 * @returns {UnifiedTransformer} The transformer function
 */
export default function rehypeSlugLink(options = {}) {
  if (options !== null && typeof options !== "object") {
    throw new TypeError(
      `${PACKAGE}: options must be an object, null, or undefined`,
    );
  }

  const config = resolveOptions(options ?? {});
  const pattern = compilePattern(config);

  return (tree) => {
    const headings = indexHeadings(tree, config);
    /** @type {Map<HastElement, Heading>} */
    const createdLinks = new Map();

    visit(tree, (node, index, parent) => {
      if (node.type === "element") {
        return SKIPPED_ELEMENTS.has(node.tagName) ? SKIP : undefined;
      }
      if (node.type !== "text" || parent === undefined || index === undefined) {
        return undefined;
      }

      const replacement = convertText(
        node.value,
        pattern,
        headings,
        config,
        createdLinks,
      );
      if (replacement === null) return undefined;

      parent.children.splice(index, 1, ...replacement);
      // Continue after the inserted nodes; they contain no link syntax to convert.
      return [SKIP, index + replacement.length];
    });

    // Link text is taken from the headings after their own text has been
    // converted, so that link syntax inside a heading never leaks into labels.
    for (const [link, heading] of createdLinks) {
      link.children = [{ type: "text", value: labelOf(heading, createdLinks) }];
    }
  };
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Resolve deprecated option names, apply defaults, and validate.
 * @param {RehypeSlugLinkOptions} options - Raw options from the user
 * @returns {ResolvedOptions} Validated options with defaults applied
 * @throws {TypeError} When an option has an invalid value
 */
function resolveOptions(options) {
  if (options.patternGroupMissing !== undefined) {
    warnDeprecatedOption("patternGroupMissing", "missingCaptureGroupHandling");
  }
  if (options.invalidSlug !== undefined) {
    warnDeprecatedOption("invalidSlug", "invalidSlugHandling");
  }

  /** @type {ResolvedOptions} */
  const resolved = {
    pattern: options.pattern ?? DEFAULT_PATTERN,
    missingCaptureGroupHandling:
      options.missingCaptureGroupHandling ??
      options.patternGroupMissing ??
      "wrap",
    fallbackToHeadingText: options.fallbackToHeadingText ?? false,
    invalidSlugHandling:
      options.invalidSlugHandling ?? options.invalidSlug ?? "convert",
    maintainCase: options.maintainCase ?? false,
    normalizeUnicode: options.normalizeUnicode ?? false,
  };

  validateOptions(resolved);
  return resolved;
}

/**
 * Emit a deprecation warning for an option, at most once per option name.
 * Uses `process.emitWarning` when available (Node.js) so that the standard
 * `--no-deprecation` / `--throw-deprecation` flags apply, and falls back to
 * `console.warn` in other environments.
 * @param {string} oldName - Deprecated option name
 * @param {string} newName - Replacement option name
 */
function warnDeprecatedOption(oldName, newName) {
  if (warnedDeprecatedOptions.has(oldName)) return;
  warnedDeprecatedOptions.add(oldName);

  const message = `${PACKAGE}: the \`${oldName}\` option is deprecated. Use \`${newName}\` instead.`;
  const nodeProcess =
    /** @type {{ process?: { emitWarning?: (warning: string, type: string) => void } }} */ (
      globalThis
    ).process;

  if (typeof nodeProcess?.emitWarning === "function") {
    nodeProcess.emitWarning(message, "DeprecationWarning");
  } else {
    console.warn(message);
  }
}

/** @type {Set<string>} */
const warnedDeprecatedOptions = new Set();

/**
 * Validate plugin options.
 * @param {ResolvedOptions} options - Options to validate (with defaults applied)
 * @throws {TypeError} When options are invalid
 */
function validateOptions(options) {
  const validMissingCaptureGroupOptions = ["wrap", "error"];
  const validInvalidOptions = ["convert", "error"];

  if (!(options.pattern instanceof RegExp)) {
    throw new TypeError(`${PACKAGE}: pattern must be a RegExp instance`);
  }
  if (
    !validMissingCaptureGroupOptions.includes(
      options.missingCaptureGroupHandling,
    )
  ) {
    throw new TypeError(
      `${PACKAGE}: missingCaptureGroupHandling must be "wrap" or "error"`,
    );
  }
  if (typeof options.fallbackToHeadingText !== "boolean") {
    throw new TypeError(`${PACKAGE}: fallbackToHeadingText must be a boolean`);
  }
  if (!validInvalidOptions.includes(options.invalidSlugHandling)) {
    throw new TypeError(
      `${PACKAGE}: invalidSlugHandling must be "convert" or "error"`,
    );
  }
  if (typeof options.maintainCase !== "boolean") {
    throw new TypeError(`${PACKAGE}: maintainCase must be a boolean`);
  }
  if (typeof options.normalizeUnicode !== "boolean") {
    throw new TypeError(`${PACKAGE}: normalizeUnicode must be a boolean`);
  }
}

/**
 * Build the regular expression the plugin owns and iterates with: always
 * global (so every occurrence is found and the user's RegExp is never
 * mutated), never sticky, and guaranteed to have a capture group.
 * @param {ResolvedOptions} options - Plugin options
 * @returns {RegExp} Pattern with a capture group and the `g` flag
 * @throws {TypeError} When the pattern has no capture group and missingCaptureGroupHandling is "error"
 */
function compilePattern(options) {
  const { pattern, missingCaptureGroupHandling } = options;
  const flags = pattern.flags.replace(/[gy]/g, "");

  // Appending an empty alternative yields a match with one slot per capture group.
  const probe = new RegExp(`${pattern.source}|`, flags).exec("");
  /* v8 ignore next */
  const groupCount = probe === null ? 0 : probe.length - 1;

  if (groupCount > 0) {
    return new RegExp(pattern.source, `${flags}g`);
  }
  if (missingCaptureGroupHandling === "error") {
    throw new TypeError(
      `${PACKAGE}: pattern must contain a capture group ( ... ) when missingCaptureGroupHandling is "error".`,
    );
  }
  return new RegExp(`(${pattern.source})`, `${flags}g`);
}

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

/**
 * Collect the headings of the document that have an id.
 * @param {HastRoot} tree - The HAST tree
 * @param {ResolvedOptions} options - Plugin options
 * @returns {HeadingIndex} Lookup tables
 */
function indexHeadings(tree, options) {
  /** @type {HeadingIndex} */
  const index = {
    byId: new Map(),
    byText: new Map(),
    byNormalizedId: new Map(),
    byNormalizedText: new Map(),
  };

  visit(tree, "element", (node) => {
    if (!HEADING_PATTERN.test(node.tagName)) return;

    const rawId = node.properties.id;
    if (rawId === undefined || rawId === null) return;
    const id = String(rawId);
    if (id === "") return;

    /** @type {Heading} */
    const heading = { node, id, label: undefined };
    const text = collapseWhitespace(extractText(node));

    setIfAbsent(index.byId, id, heading);
    if (text !== "") setIfAbsent(index.byText, text, heading);

    if (options.normalizeUnicode) {
      setIfAbsent(index.byNormalizedId, normalizeKey(id), heading);
      if (text !== "") {
        setIfAbsent(index.byNormalizedText, normalizeKey(text), heading);
      }
    }
  });

  return index;
}

/**
 * @param {Map<string, Heading>} map - Lookup table
 * @param {string} key - Key
 * @param {Heading} heading - Heading to store unless the key is taken
 */
function setIfAbsent(map, key, heading) {
  if (!map.has(key)) map.set(key, heading);
}

/**
 * Resolve the text captured by the pattern to a heading.
 *
 * Order: the text as written (exact id, heading text when
 * fallbackToHeadingText is on, normalized forms when normalizeUnicode is on),
 * then the same lookups with the github-slugger form of the text, which is
 * the id slug plugins would have generated for it.
 *
 * @param {string} captured - Text captured by the pattern
 * @param {HeadingIndex} headings - Lookup tables
 * @param {ResolvedOptions} options - Plugin options
 * @returns {Heading | null} The heading, or null when nothing matches
 * @throws {Error} When the text is not a valid slug and invalidSlugHandling is "error"
 */
function resolveReference(captured, headings, options) {
  const direct = lookupHeading(captured, headings, options);
  if (direct !== null) return direct;

  if (!VALID_SLUG.test(captured) && options.invalidSlugHandling === "error") {
    throw new Error(
      `${PACKAGE}: invalid slug "${captured}" in link syntax. Slugs may only contain letters, digits, "-" and "_".`,
    );
  }

  const converted = githubSlug(captured, options.maintainCase);
  if (converted === "" || converted === captured) return null;
  return lookupHeading(converted, headings, options);
}

/**
 * Look a key up in the heading index.
 * @param {string} key - Id or heading text
 * @param {HeadingIndex} headings - Lookup tables
 * @param {ResolvedOptions} options - Plugin options
 * @returns {Heading | null} The heading, or null
 */
function lookupHeading(key, headings, options) {
  const byId = headings.byId.get(key);
  if (byId !== undefined) return byId;

  if (options.fallbackToHeadingText) {
    const byText = headings.byText.get(collapseWhitespace(key));
    if (byText !== undefined) return byText;
  }

  if (options.normalizeUnicode) {
    const normalized = normalizeKey(key);
    const byNormalizedId = headings.byNormalizedId.get(normalized);
    if (byNormalizedId !== undefined) return byNormalizedId;
    const byNormalizedText = headings.byNormalizedText.get(normalized);
    if (byNormalizedText !== undefined) return byNormalizedText;
  }

  return null;
}

/**
 * The text shown for links to a heading: its text content after processing,
 * or its id when it has no text. Links inside the heading contribute the
 * label of their own target.
 * @param {Heading} heading - Target heading
 * @param {Map<HastElement, Heading>} createdLinks - Links created by this run
 * @returns {string} Link text
 */
function labelOf(heading, createdLinks) {
  if (heading.label !== undefined) return heading.label;
  // Guards against headings that (indirectly) link to themselves.
  heading.label = heading.id;

  const text = collapseWhitespace(extractText(heading.node, createdLinks));
  heading.label = text === "" ? heading.id : text;
  return heading.label;
}

// ---------------------------------------------------------------------------
// Text conversion
// ---------------------------------------------------------------------------

/**
 * Replace link syntax in a text with link elements.
 * @param {string} text - Text node value
 * @param {RegExp} pattern - Global pattern with a capture group
 * @param {HeadingIndex} headings - Lookup tables
 * @param {ResolvedOptions} options - Plugin options
 * @param {Map<HastElement, Heading>} createdLinks - Receives the created links
 * @returns {Array<HastText | HastElement> | null} Replacement nodes, or null when nothing was linked
 */
function convertText(text, pattern, headings, options, createdLinks) {
  /** @type {Array<HastText | HastElement>} */
  const nodes = [];
  let consumed = 0;

  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match[0] === "") {
      pattern.lastIndex = nextCharacterIndex(text, match.index, pattern);
      continue;
    }

    const captured =
      match.slice(1).find((group) => group !== undefined) ?? match[0];
    if (captured === "") continue;

    const heading = resolveReference(captured, headings, options);
    if (heading === null) continue;

    if (match.index > consumed) {
      nodes.push({ type: "text", value: text.slice(consumed, match.index) });
    }
    /** @type {HastElement} */
    const link = {
      type: "element",
      tagName: "a",
      properties: { href: `#${heading.id}` },
      children: [],
    };
    createdLinks.set(link, heading);
    nodes.push(link);
    consumed = match.index + match[0].length;
  }

  if (nodes.length === 0) return null;
  if (consumed < text.length) {
    nodes.push({ type: "text", value: text.slice(consumed) });
  }
  return nodes;
}

/**
 * Index of the character after the one at `index`, stepping over a surrogate
 * pair when the pattern works in Unicode mode.
 * @param {string} text - Text being scanned
 * @param {number} index - Current index
 * @param {RegExp} pattern - Pattern being used
 * @returns {number} Next index
 */
function nextCharacterIndex(text, index, pattern) {
  const unicode = pattern.flags.includes("u") || pattern.flags.includes("v");
  const codePoint = text.codePointAt(index);
  return (
    index + (unicode && codePoint !== undefined && codePoint > 0xffff ? 2 : 1)
  );
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/**
 * Extract the text content of a node. Links created by this run contribute
 * their target's label instead of their (not yet filled) children.
 * @param {HastNodes} node - The node to extract text from
 * @param {Map<HastElement, Heading>} [createdLinks] - Links created by this run
 * @returns {string} The text content
 */
function extractText(node, createdLinks) {
  if (node.type === "text") return node.value;
  if (node.type !== "element" && node.type !== "root") return "";

  if (createdLinks !== undefined && node.type === "element") {
    const heading = createdLinks.get(node);
    if (heading !== undefined) return labelOf(heading, createdLinks);
  }

  return node.children
    .map((child) => extractText(child, createdLinks))
    .join("");
}

/**
 * Collapse runs of whitespace to one space and trim.
 * @param {string} text - Text
 * @returns {string} Collapsed text
 */
function collapseWhitespace(text) {
  return text.replace(WHITESPACE_RUN, " ").trim();
}

/**
 * Key used for normalizeUnicode matching: ASCII-folded and lower-cased.
 * @param {string} text - Id or text
 * @returns {string} Key
 */
function normalizeKey(text) {
  return normalizeUnicode(text).toLowerCase();
}

// ---------------------------------------------------------------------------
// Unicode normalization
// ---------------------------------------------------------------------------

/** Latin letters without a canonical decomposition, mapped to ASCII. */
const LATIN_TO_ASCII = /** @type {Record<string, string>} */ ({
  æ: "ae",
  Æ: "AE",
  ø: "o",
  Ø: "O",
  þ: "th",
  Þ: "TH",
  ð: "dh",
  Ð: "DH",
  ß: "ss",
  œ: "oe",
  Œ: "OE",
  ł: "l",
  Ł: "L",
  đ: "d",
  Đ: "D",
  ı: "i",
  ħ: "h",
  Ħ: "H",
  ŧ: "t",
  Ŧ: "T",
});
const LATIN_TO_ASCII_PATTERN = new RegExp(
  `[${Object.keys(LATIN_TO_ASCII).join("")}]`,
  "g",
);
/** Combining marks that follow a Latin base letter (after NFD). */
const LATIN_COMBINING_MARKS = /(\p{Script=Latin})[̀-ͯ]+/gu;
const ASCII_ONLY = /^[\x00-\x7f]*$/;

/**
 * Normalize Latin-based accented characters to ASCII equivalents.
 * Other scripts (Cyrillic, Greek, CJK, ...) are left untouched, including
 * their combining marks. Identical to the function in rehype-heading-slug so
 * that ids generated there can be matched here.
 * @param {string} text - The text to normalize
 * @returns {string} The normalized text
 */
function normalizeUnicode(text) {
  if (ASCII_ONLY.test(text)) return text;
  return text
    .normalize("NFD")
    .replace(LATIN_COMBINING_MARKS, "$1")
    .replace(LATIN_TO_ASCII_PATTERN, (char) => LATIN_TO_ASCII[char])
    .normalize("NFC");
}
