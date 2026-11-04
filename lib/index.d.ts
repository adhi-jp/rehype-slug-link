import type { Transformer } from "unified";
import type { Root } from "hast";

/**
 * How to handle a `pattern` that has no capture group.
 * - 'wrap': Wrap the whole pattern in a capture group
 * - 'error': Throw an error
 */
export type MissingCaptureGroupHandling = "wrap" | "error";

/**
 * How to handle slugs that contain characters other than ASCII letters,
 * digits, hyphens, and underscores.
 * - 'convert': Convert invalid slugs using github-slugger
 * - 'error': Throw an error
 */
export type InvalidSlugHandling = "convert" | "error";

/**
 * Configuration options for the rehype-slug-link plugin.
 */
export interface RehypeSlugLinkOptions {
  /**
   * Regular expression matching the link syntax. The first capture group is
   * used as the slug. Use the global (`g`) flag to match every occurrence.
   * @default /\[\{#([a-zA-Z0-9-_\u00C0-\uFFFF]+)\}\]/g
   */
  pattern?: RegExp;

  /**
   * How to handle a `pattern` that has no capture group.
   * @default 'wrap'
   */
  missingCaptureGroupHandling?: MissingCaptureGroupHandling;

  /**
   * Use heading text as slug if id not found.
   * @default false
   */
  fallbackToHeadingText?: boolean;

  /**
   * How to handle invalid slugs.
   * @default 'convert'
   */
  invalidSlugHandling?: InvalidSlugHandling;

  /**
   * Preserve case when generating slugs.
   * @default false
   */
  maintainCase?: boolean;

  /**
   * Normalize Unicode characters to ASCII equivalents.
   * Only converts Latin-based accented characters, preserving other character systems
   * (Cyrillic, CJK, etc.). Uses NFD normalization to decompose characters, removes
   * combining diacritical marks, and converts special characters like æ→ae, ø→o, etc.
   * @default false
   */
  normalizeUnicode?: boolean;

  /**
   * Behavior when pattern has no capture groups.
   * @deprecated Use `missingCaptureGroupHandling` instead. Ignored when
   * `missingCaptureGroupHandling` is also set.
   */
  patternGroupMissing?: MissingCaptureGroupHandling;

  /**
   * How to handle invalid slugs.
   * @deprecated Use `invalidSlugHandling` instead. Ignored when
   * `invalidSlugHandling` is also set.
   */
  invalidSlug?: InvalidSlugHandling;
}

/**
 * Rehype plugin that converts link syntax to heading links.
 *
 * @param options - Plugin configuration options
 * @returns The transformer function
 */
declare function rehypeSlugLink(
  options?: RehypeSlugLinkOptions,
): Transformer<Root, Root>;

export default rehypeSlugLink;
