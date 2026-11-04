import type { Transformer } from "unified";
import type { Root } from "hast";

/**
 * How to handle a `pattern` that has no capture group.
 * - 'wrap': Wrap the whole pattern in a capture group
 * - 'error': Throw an error
 */
export type MissingCaptureGroupHandling = "wrap" | "error";

/**
 * How to handle a reference that contains characters other than letters,
 * digits, `-`, and `_` (ASCII or U+00C0–U+FFFF) and does not resolve as
 * written.
 * - 'convert': Convert it with github-slugger and look the result up
 * - 'error': Throw an error
 */
export type InvalidSlugHandling = "convert" | "error";

/**
 * Configuration options for the rehype-slug-link plugin.
 */
export interface RehypeSlugLinkOptions {
  /**
   * Regular expression matching the link syntax. The first capture group is
   * the reference (a heading id, or heading text with `fallbackToHeadingText`).
   * Every occurrence is converted: the `g` flag is added when missing and the
   * `y` flag is ignored. Text inside `<a>`, `<code>`, `<kbd>`, `<math>`,
   * `<pre>`, `<samp>`, `<script>`, `<style>`, `<svg>`, `<template>`,
   * `<textarea>`, and `<title>` is never converted.
   * @default /\[\{#([^}]+)\}\]/g
   */
  pattern?: RegExp;

  /**
   * How to handle a `pattern` that has no capture group.
   * @default 'wrap'
   */
  missingCaptureGroupHandling?: MissingCaptureGroupHandling;

  /**
   * Also resolve references by heading text (whitespace-collapsed, exact
   * match). When several headings share the same text, the first one wins.
   * @default false
   */
  fallbackToHeadingText?: boolean;

  /**
   * How to handle invalid references.
   * @default 'convert'
   */
  invalidSlugHandling?: InvalidSlugHandling;

  /**
   * Preserve case when converting a reference with github-slugger.
   * @default false
   */
  maintainCase?: boolean;

  /**
   * Also match references after normalizing Latin-based accented characters
   * to ASCII (é→e, ø→o, ß→ss, ...) and ignoring case, against both heading
   * ids and heading text. Other scripts (Cyrillic, Greek, CJK, ...) are
   * preserved. Normalization only affects matching; the link text is always
   * the heading's original text.
   * @default false
   */
  normalizeUnicode?: boolean;

  /**
   * Behavior when pattern has no capture groups.
   * @deprecated Use `missingCaptureGroupHandling` instead.
   * `missingCaptureGroupHandling` takes precedence when both are set.
   */
  patternGroupMissing?: MissingCaptureGroupHandling;

  /**
   * How to handle invalid slugs.
   * @deprecated Use `invalidSlugHandling` instead.
   * `invalidSlugHandling` takes precedence when both are set.
   */
  invalidSlug?: InvalidSlugHandling;
}

/**
 * Rehype plugin that converts link syntax to heading links.
 *
 * A reference is resolved in this order: as written (exact id, heading text
 * with `fallbackToHeadingText`, normalized forms with `normalizeUnicode`),
 * then in its github-slugger form (the id a slug plugin would generate for
 * it). The link text is the heading's text after processing (whitespace
 * collapsed), or its id when the heading has no text. References that do not
 * resolve are left unchanged.
 *
 * Errors: invalid options throw a `TypeError`; an invalid reference in
 * 'error' mode throws an `Error`. All messages start with `rehype-slug-link:`.
 *
 * @param options - Plugin configuration options
 * @returns The transformer function
 */
declare function rehypeSlugLink(
  options?: RehypeSlugLinkOptions | null,
): Transformer<Root, Root>;

export default rehypeSlugLink;
