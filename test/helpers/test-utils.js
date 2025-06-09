/**
 * Test utilities for rehype-slug-link plugin
 */
import { rehype } from "rehype";
import rehypeSlug from "rehype-slug";
import rehypeSlugLink from "rehype-slug-link";

/**
 * Creates a basic rehype processor with fragment settings
 */
export function createProcessor(options = {}) {
  return rehype()
    .data("settings", { fragment: true })
    .use(rehypeSlugLink, options);
}

/**
 * Creates a rehype processor with rehype-slug integration
 */
export function createProcessorWithSlug(options = {}) {
  return rehype()
    .data("settings", { fragment: true })
    .use(rehypeSlug)
    .use(rehypeSlugLink, options);
}

/**
 * Processes HTML and returns the string result
 */
export async function processHtml(html, options = {}) {
  const result = await createProcessor(options).process(html);
  return result.value.toString();
}

/**
 * Processes HTML with rehype-slug and returns the string result
 */
export async function processHtmlWithSlug(html, options = {}) {
  const result = await createProcessorWithSlug(options).process(html);
  return result.value.toString();
}
