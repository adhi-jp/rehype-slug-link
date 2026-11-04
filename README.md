# rehype-slug-link

[![build status](https://github.com/adhi-jp/rehype-slug-link/actions/workflows/ci.yml/badge.svg)](https://github.com/adhi-jp/rehype-slug-link/actions)
[![npm version](https://img.shields.io/npm/v/rehype-slug-link.svg)](https://www.npmjs.com/package/rehype-slug-link)
[![codecov](https://codecov.io/gh/adhi-jp/rehype-slug-link/graph/badge.svg?token=MW7COHPSBF)](https://codecov.io/gh/adhi-jp/rehype-slug-link)

A [rehype](https://github.com/rehypejs/rehype) plugin that converts custom link syntax (e.g. `[{#slug}]`) in text nodes into anchor links to headings, by collecting heading IDs and their text content.

---

## Overview

**rehype-slug-link** is a [unified](https://github.com/unifiedjs/unified) ([rehype](https://github.com/rehypejs/rehype)) plugin that enables you to write internal links to headings using a customizable inline syntax. It scans the document for headings, collects their IDs and text, and replaces matching patterns in text nodes with anchor links to those headings.

- **Customizable link syntax**: Default is `[{#slug}]`, but any RegExp can be used.
- **Flexible matching**: Supports multiple links per paragraph, deeply nested structures, and custom fallback behaviors.
- **Unicode normalization**: Optionally match references regardless of accents and case.
- **TypeScript support**: Includes type definitions.

---

## When Should You Use This Plugin?

Use **rehype-slug-link** if you want:

- To write internal links to headings using a simple, readable inline syntax.
- To support custom or non-standard link notations in your markdown/HTML.
- To automatically convert inline references to anchor links, even in complex or deeply nested content.
- To control how unmatched or invalid slugs are handled.
- To work with multilingual or Unicode content.

---

## Installation

```sh
npm install rehype-slug-link
```

---

## Usage Example

```js
import { rehype } from "rehype";
import rehypeSlug from "rehype-slug";
import rehypeSlugLink from "rehype-slug-link";

const file = await rehype()
  .data("settings", { fragment: true })
  .use(rehypeSlug) // Ensure headings have IDs
  .use(rehypeSlugLink)
  .process("<h1>Introduction</h1><p>See [{#introduction}]</p>");

console.log(String(file));
// <h1 id="introduction">Introduction</h1><p>See <a href="#introduction">Introduction</a></p>
```

### Custom Pattern Example

```js
import { rehype } from "rehype";
import rehypeSlug from "rehype-slug";
import rehypeSlugLink from "rehype-slug-link";

const file = await rehype()
  .data("settings", { fragment: true })
  .use(rehypeSlug)
  .use(rehypeSlugLink, { pattern: /\[link:([^\]]+)\]/g })
  .process("<h1>Intro</h1><p>See [link:intro]</p>");

console.log(String(file));
// <h1 id="intro">Intro</h1><p>See <a href="#intro">Intro</a></p>
```

### Multiple Links Example

```html
<!-- Input -->
<h1>Chapter 1</h1>
<h2>Chapter 2</h2>
<p>Read [{#chapter-1}] before [{#chapter-2}].</p>

<!-- Output -->
<h1 id="chapter-1">Chapter 1</h1>
<h2 id="chapter-2">Chapter 2</h2>
<p>
  Read <a href="#chapter-1">Chapter 1</a> before
  <a href="#chapter-2">Chapter 2</a>.
</p>
```

### With Custom Heading IDs

```js
import { rehype } from "rehype";
import rehypeHeadingSlug from "rehype-heading-slug";
import rehypeSlugLink from "rehype-slug-link";

const file = await rehype()
  .data("settings", { fragment: true })
  .use(rehypeHeadingSlug) // Supports {#custom-id} syntax
  .use(rehypeSlugLink)
  .process("<h1>Advanced Topics {#advanced}</h1><p>See [{#advanced}]</p>");

console.log(String(file));
// <h1 id="advanced">Advanced Topics</h1><p>See <a href="#advanced">Advanced Topics</a></p>
```

---

## Advanced Examples

### Fallback to Heading Text

```js
import { rehype } from "rehype";
import rehypeSlug from "rehype-slug";
import rehypeSlugLink from "rehype-slug-link";

const file = await rehype()
  .data("settings", { fragment: true })
  .use(rehypeSlug)
  .use(rehypeSlugLink, {
    fallbackToHeadingText: true,
    pattern: /\[text:([^\]]+)\]/g,
  })
  .process("<h1>Introduction</h1><p>See [text:Introduction]</p>");

console.log(String(file));
// <h1 id="introduction">Introduction</h1><p>See <a href="#introduction">Introduction</a></p>
```

### Unicode Normalization

```js
import { rehype } from "rehype";
import rehypeHeadingSlug from "rehype-heading-slug";
import rehypeSlugLink from "rehype-slug-link";

const file = await rehype()
  .data("settings", { fragment: true })
  .use(rehypeHeadingSlug, { normalizeUnicode: true })
  .use(rehypeSlugLink, { normalizeUnicode: true })
  .process("<h1>café</h1><p>See [{#cafe}]</p>");

console.log(String(file));
// <h1 id="cafe">café</h1><p>See <a href="#cafe">café</a></p>
```

---

## API

### `rehype().use(rehypeSlugLink[, options])`

Replaces custom link syntax in text nodes with anchor links to headings, based on collected heading IDs and text.

#### Options

All options are optional:

| Name                          | Type    | Default               | Description                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pattern`                     | RegExp  | `/\[\{#([^}]+)\}\]/g` | Regular expression to match link syntax. The first capture group is the reference. Every occurrence is converted (`g` is added when missing, `y` is ignored).                                                                                                                                                    |
| `missingCaptureGroupHandling` | string  | `"wrap"`              | If `pattern` has no capture group: `"wrap"` (wrap whole pattern), or `"error"` (throw error).                                                                                                                                                                                                                    |
| `fallbackToHeadingText`       | boolean | `false`               | Also resolve references by heading text (whitespace-collapsed, exact match). The first heading with that text wins.                                                                                                                                                                                              |
| `invalidSlugHandling`         | string  | `"convert"`           | How to handle a reference containing characters other than letters, digits, `-`, and `_` that does not resolve as written: `"convert"` (convert with github-slugger, then look it up) or `"error"` (throw error).                                                                                                |
| `maintainCase`                | boolean | `false`               | Preserve case when converting a reference with github-slugger.                                                                                                                                                                                                                                                   |
| `normalizeUnicode`            | boolean | `false`               | Also match references after normalizing Latin-based accented characters to ASCII (`é` to `e`, `ø` to `o`, `ß` to `ss`, ...) and ignoring case, against both heading ids and heading text. Other scripts (Cyrillic, CJK, etc.) are preserved. Matching only: the link text is always the heading's original text. |

Options shared with [rehype-heading-slug](https://github.com/adhi-jp/rehype-heading-slug) (`pattern`, `missingCaptureGroupHandling`, `invalidSlugHandling`, `maintainCase`, and `normalizeUnicode`) use the same names and accepted values in both plugins.

#### How references are resolved

1. As written: an exact heading id, the heading text (with `fallbackToHeadingText`), or their normalized forms (with `normalizeUnicode`).
2. If that fails and the reference is not a valid slug, `invalidSlugHandling` applies (`"error"` throws here).
3. The github-slugger form of the reference (the id [rehype-slug](https://github.com/rehypejs/rehype-slug) or [rehype-heading-slug](https://github.com/adhi-jp/rehype-heading-slug) would generate for it, e.g. `[{#My Heading}]` → `my-heading`), looked up the same way.

References that do not resolve are left unchanged. The link text is the heading's text after processing (whitespace collapsed), or its id when the heading has no text. Text inside `<a>`, `<code>`, `<kbd>`, `<math>`, `<pre>`, `<samp>`, `<script>`, `<style>`, `<svg>`, `<template>`, `<textarea>`, and `<title>` is never converted, so the syntax can be documented literally and running the plugin twice is safe.

#### Errors

Invalid options throw a `TypeError`. An invalid reference in `"error"` mode throws an `Error`. All messages start with `rehype-slug-link:`.

#### Deprecated options

The following options are still accepted for backward compatibility but will be removed in a future major version. Using one emits a `DeprecationWarning` once. If both a deprecated option and its replacement are given, the replacement takes precedence.

| Deprecated            | Replacement                   |
| --------------------- | ----------------------------- |
| `patternGroupMissing` | `missingCaptureGroupHandling` |
| `invalidSlug`         | `invalidSlugHandling`         |

---

## Security

**⚠️ Important:** This plugin generates anchor links based on heading IDs and text content. If your content is user-generated, always use [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) to prevent [XSS](https://en.wikipedia.org/wiki/Cross-site_scripting) and DOM clobbering risks.

---

## Related Plugins

- [rehype-slug](https://github.com/rehypejs/rehype-slug): Simple plugin for generating heading slugs.
- [rehype-slug-custom-id](https://github.com/playfulprogramming/rehype-slug-custom-id): Simple ID assignment with explicit slug notation support.
- [rehype-heading-slug](https://github.com/adhi-jp/rehype-heading-slug): Heading slugger with explicit slug notation and additional options.

---

## AI-Assisted Development

This project was developed with the help of GitHub Copilot and other generative AI tools.  
**Disclaimer:** Please review and test thoroughly before using in production.

---

## License

[MIT License](./LICENSE) © adhi-jp
