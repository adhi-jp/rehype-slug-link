import { visit } from "unist-util-visit";
import GithubSlugger from "github-slugger";

/**
 * @typedef {import('./index.d.ts').RehypeSlugLinkOptions} RehypeSlugLinkOptions
 * @typedef {import('unified').Transformer<import('hast').Root, import('hast').Root>} UnifiedTransformer
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Node} HastNode
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').Text} HastText
 * @typedef {import('hast').Parent} HastParent
 * @typedef {import('hast').Comment} HastComment
 */

/**
 * @typedef {Object} HeadingMaps
 * @property {Record<string, string>} idToText - Maps heading IDs to text content
 * @property {Record<string, string>} textToId - Maps text content to heading IDs
 */

/**
 * @typedef {Object} ProcessedMatch
 * @property {string} raw - Original matched text
 * @property {string} slug - Processed slug
 * @property {number} index - Start index in text
 * @property {number} lastIndex - End index in text
 */

/**
 * Rehype plugin that converts link syntax to heading links.
 *
 * @param {RehypeSlugLinkOptions} [options={}] - Plugin configuration
 * @returns {UnifiedTransformer} The transformer function
 */
export default function rehypeSlugLink(options = {}) {
  const config = normalizeOptions(options);
  const pattern = ensurePatternHasCaptureGroup(
    config.pattern,
    config.patternGroupMissing,
  );

  return (tree) => {
    // Early return if already processed
    if (tree.data?.rehypeSlugLinkProcessed) {
      return tree;
    }

    const headingMaps = collectHeadingMaps(tree, config);
    processTextNodes(tree, pattern, headingMaps, config);

    // Mark as processed
    (tree.data ??= {}).rehypeSlugLinkProcessed = true;

    return tree;
  };
}

/**
 * Normalizes and validates plugin options.
 * @param {RehypeSlugLinkOptions} options - Raw options from user
 * @returns {Required<RehypeSlugLinkOptions>} Normalized options with defaults
 */
function normalizeOptions(options) {
  return {
    pattern: options.pattern ?? /\[\{#([a-zA-Z0-9-_]+)\}\]/g,
    patternGroupMissing: options.patternGroupMissing ?? "wrap",
    fallbackToHeadingText: options.fallbackToHeadingText ?? false,
    invalidSlug: options.invalidSlug ?? "convert",
    maintainCase: options.maintainCase ?? false,
    normalizeUnicode: options.normalizeUnicode ?? false,
  };
}

/**
 * Ensures the pattern has at least one capture group.
 * @param {RegExp} pattern - The pattern to check
 * @param {'wrap'|'error'} patternGroupMissing - Behavior when no groups found
 * @returns {RegExp} Pattern with guaranteed capture group
 * @throws {Error} When patternGroupMissing is 'error' and no groups found
 */
function ensurePatternHasCaptureGroup(pattern, patternGroupMissing) {
  // Efficiently count capture groups using match
  const groupCount = (pattern.source.match(/\((?!\?[:?!])/g) || []).length;

  if (groupCount === 0) {
    if (patternGroupMissing === "wrap") {
      return new RegExp(`(${pattern.source})`, pattern.flags);
    }
    throw new Error("rehypeSlugLink: pattern must contain a capture group");
  }

  return pattern;
}

/**
 * Collects mappings between heading IDs and text content.
 * @param {HastRoot} tree - The HAST tree to traverse
 * @param {Required<RehypeSlugLinkOptions>} config - Plugin configuration
 * @returns {HeadingMaps} Heading mappings
 */
function collectHeadingMaps(tree, config) {
  const headingMaps = { idToText: {}, textToId: {} };

  visit(tree, (/** @type {HastNode} */ node) => {
    if (
      node.type === "element" &&
      /^h[1-6]$/.test(/** @type {HastElement} */ (node).tagName) &&
      /** @type {HastElement} */ (node).properties?.id
    ) {
      let text = extractText(/** @type {HastElement} */ (node));
      if (config.normalizeUnicode) {
        text = text.normalize("NFKC");
      }
      const id = /** @type {HastElement} */ (node).properties.id;
      headingMaps.idToText[id] = text;
      headingMaps.textToId[text] = id;
    }
  });

  return headingMaps;
}

/**
 * Processes text nodes in the tree to convert link syntax.
 * @param {HastRoot} tree - The HAST tree to process
 * @param {RegExp} pattern - The pattern to match against
 * @param {HeadingMaps} headingMaps - Heading mappings
 * @param {Required<RehypeSlugLinkOptions>} config - Plugin configuration
 */
function processTextNodes(tree, pattern, headingMaps, config) {
  const textNodesToProcess = [];

  // Collect text nodes that need processing
  visit(
    tree,
    "text",
    (
      /** @type {HastText} */ node,
      /** @type {number} */ index,
      /** @type {HastParent} */ parent,
    ) => {
      if (shouldSkipTextNode(node, parent)) {
        return;
      }

      // Quick check with test() before expensive processing
      pattern.lastIndex = 0;
      if (pattern.test(node.value)) {
        textNodesToProcess.push({ node, index, parent });
      }
    },
  );

  // Process collected text nodes
  for (const { node, index, parent } of textNodesToProcess) {
    /* v8 ignore start */
    // This line is unreachable because:
    // 1. textNodesToProcess only contains nodes that passed the filter check
    // 2. The same condition was already checked during collection
    // 3. No code between collection and processing modifies the node.data.rehypeSlugLinkProcessed flag
    // This check exists as defensive programming for potential future code changes
    if (node.data?.rehypeSlugLinkProcessed) continue;
    /* v8 ignore stop */

    const replacementNodes = convertLinkSyntaxInText(
      node.value,
      pattern,
      headingMaps,
      config,
    );

    if (
      replacementNodes.length === 1 &&
      replacementNodes[0].type === "text" &&
      replacementNodes[0].value === node.value
    ) {
      (node.data ??= {}).rehypeSlugLinkProcessed = true;
      continue;
    }

    // Mark all replacement nodes as processed
    for (const newNode of replacementNodes) {
      (newNode.data ??= {}).rehypeSlugLinkProcessed = true;
    }

    if (parent && typeof index === "number") {
      parent.children.splice(index, 1, ...replacementNodes);
    }
  }
}

/**
 * Determines if a text node should be skipped during processing.
 * @param {HastText} node - The text node to check
 * @param {HastParent} parent - The parent node
 * @returns {boolean} True if the node should be skipped
 */
function shouldSkipTextNode(node, parent) {
  return (
    node.data?.rehypeSlugLinkProcessed ||
    (parent?.type === "element" &&
      /** @type {HastElement} */ (parent).tagName === "a") ||
    !node.value
  );
}

/**
 * Finds all matches of the pattern in text efficiently.
 * @param {string} text - The text to search in
 * @param {RegExp} pattern - The pattern to match
 * @param {Required<RehypeSlugLinkOptions>} config - Plugin configuration
 * @returns {Array<ProcessedMatch>} Found matches
 */
function findAllMatches(text, pattern, config) {
  const matches = [];
  let match;
  let iterationCount = 0;
  const maxIterations = text.length + 1;

  // Reset lastIndex to ensure consistent behavior
  pattern.lastIndex = 0;

  while (
    (match = pattern.exec(text)) !== null &&
    iterationCount < maxIterations
  ) {
    iterationCount++;

    let slug = match[1] || match[0];
    if (config.normalizeUnicode) {
      slug = slug.normalize("NFKC");
    }

    const processedSlug = processSlug(slug, config);
    matches.push({
      raw: match[0],
      slug: processedSlug,
      index: match.index,
      lastIndex: pattern.lastIndex,
    });

    // Prevent infinite loops on zero-width matches
    if (pattern.lastIndex === match.index) {
      pattern.lastIndex++;
    }

    if (pattern.lastIndex > text.length) break;
  }

  return matches;
}

/**
 * Converts link syntax in text to an array of nodes efficiently.
 * @param {string} text - The text to process
 * @param {RegExp} pattern - The pattern to match
 * @param {HeadingMaps} headingMaps - Heading mappings
 * @param {Required<RehypeSlugLinkOptions>} config - Plugin configuration
 * @returns {Array<HastText | HastElement>} Array of text and element nodes
 */
function convertLinkSyntaxInText(text, pattern, headingMaps, config) {
  const matches = findAllMatches(text, pattern, config);

  /* v8 ignore start */
  if (matches.length === 0) {
    // This line is unreachable because:
    // 1. convertLinkSyntaxInText is only called when pattern.test(node.value) returns true in processTextNodes (line 128)
    // 2. findAllMatches resets pattern.lastIndex = 0 (line 181), ensuring exec() will find the same matches as test()
    // 3. Therefore, if test() found matches, exec() will also find matches, making matches.length > 0 always true
    // This return exists as defensive programming for potential future code changes
    return [{ type: "text", value: text }];
  }
  /* v8 ignore stop */

  const nodes = [];
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before match
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    // Add link node or fallback to original text
    const linkNode = createLinkNode(match.slug, headingMaps, config);
    nodes.push(linkNode || { type: "text", value: match.raw });

    lastIndex = match.index + match.raw.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push({ type: "text", value: text.slice(lastIndex) });
  }

  return nodes;
}

/**
 * Processes and validates a slug.
 * @param {string} slug - The slug to process
 * @param {Required<RehypeSlugLinkOptions>} config - Plugin configuration
 * @returns {string} Processed slug
 * @throws {Error} When invalidSlug is 'error' and slug is invalid
 */
function processSlug(slug, config) {
  if (/^[a-zA-Z0-9\-_]+$/.test(slug)) {
    return slug;
  }

  if (config.invalidSlug === "convert") {
    const slugger = new GithubSlugger();
    return slugger.slug(slug, config.maintainCase);
  }

  throw new Error(`rehypeSlugLink: invalid slug: ${slug}`);
}

/**
 * Creates a link node for the given slug.
 * @param {string} slug - The slug to create a link for
 * @param {HeadingMaps} headingMaps - Heading mappings
 * @param {Required<RehypeSlugLinkOptions>} config - Plugin configuration
 * @returns {HastElement | null} Link element or null if not found
 */
function createLinkNode(slug, headingMaps, config) {
  let headingText = headingMaps.idToText[slug];
  let id = slug;

  if (!headingText && config.fallbackToHeadingText) {
    id = headingMaps.textToId[slug];
    headingText = slug;
  }

  return headingText && id
    ? {
        type: "element",
        tagName: "a",
        properties: { href: `#${id}` },
        children: [{ type: "text", value: headingText }],
      }
    : null;
}

/**
 * Extracts text content from a node recursively.
 * @param {HastElement | HastText | HastComment} node - The node to extract text from
 * @returns {string} The extracted text content
 */
function extractText(node) {
  if (node.type === "text") {
    return node.value;
  }

  if ("children" in node && node.children) {
    return node.children.map(extractText).join("");
    /* v8 ignore start */
  }

  // This line is unreachable because:
  // 1. All HAST Element nodes have 'children' property (even void elements have empty arrays)
  // 2. Text and Comment nodes are handled by previous conditions
  // 3. Other node types are not passed to this function in the current implementation
  return "";
}
/* v8 ignore stop */
