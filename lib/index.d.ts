import type { Transformer } from "unified";
import type { Root } from "hast";

/**
 * Configuration options for the rehype-slug-link plugin.
 */
export interface RehypeSlugLinkOptions {
  /**
   * Link syntax regular expression pattern.
   * @default /\[\{#([a-zA-Z0-9-_]+)\}\]/g
   */
  pattern?: RegExp;

  /**
   * Behavior when pattern has no capture groups.
   * - 'wrap': Automatically wrap the pattern with capture group
   * - 'error': Throw an error
   * @default 'wrap'
   */
  patternGroupMissing?: "wrap" | "error";

  /**
   * Use heading text as slug if id not found.
   * @default false
   */
  fallbackToHeadingText?: boolean;

  /**
   * How to handle invalid slugs.
   * - 'convert': Convert invalid slugs using github-slugger
   * - 'error': Throw an error
   * @default 'convert'
   */
  invalidSlug?: "convert" | "error";

  /**
   * Preserve case when generating slugs.
   * @default false
   */
  maintainCase?: boolean;

  /**
   * Normalize Unicode characters.
   * @default false
   */
  normalizeUnicode?: boolean;
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
