import { describe, it, expect } from "vitest";
import rehypeSlugLink from "../index.js";
import { processHtmlWithSlug } from "./helpers/test-utils.js";

describe("rehype-slug-link: pattern configuration", () => {
  it("throws error when pattern has no capture group and patternGroupMissing is 'error'", () => {
    expect(() =>
      rehypeSlugLink({ pattern: /foo/, patternGroupMissing: "error" }),
    ).toThrow(/must contain a capture group/);
  });

  it("wraps pattern when no capture group exists and patternGroupMissing is 'wrap'", async () => {
    const result = await processHtmlWithSlug("<h1>foo</h1><p>foo</p>", {
      pattern: /foo/,
      patternGroupMissing: "wrap",
    });

    expect(result).toContain('<a href="#foo">foo</a>');
  });

  it("handles zero-width matches safely", async () => {
    const result = await processHtmlWithSlug("<h1>foo</h1><p>foo</p>", {
      pattern: /(?=foo)/g,
      patternGroupMissing: "wrap",
    });

    expect(result).toContain("<p>foo</p>");
  });
});

describe("rehype-slug-link: slug handling options", () => {
  it("converts invalid slugs when invalidSlug is 'convert'", async () => {
    const result = await processHtmlWithSlug(
      "<h1>Invalid Slug With Spaces!</h1><p>See [link:Invalid Slug With Spaces!]</p>",
      {
        pattern: /\[link:([^\]]+)\]/g,
        invalidSlug: "convert",
      },
    );

    expect(result).toContain('href="#invalid-slug-with-spaces"');
  });

  it("throws error for invalid slugs when invalidSlug is 'error'", async () => {
    await expect(() =>
      processHtmlWithSlug("<h1>Test</h1><p>[link:invalid slug!]</p>", {
        pattern: /\[link:([^\]]+)\]/g,
        invalidSlug: "error",
      }),
    ).rejects.toThrow(/invalid slug/);
  });

  it("maintains case when maintainCase is true", async () => {
    const result = await processHtmlWithSlug(
      '<h1 id="Test-Section">Test Section</h1><p>See [link:Test Section!!]</p>',
      {
        pattern: /\[link:([^\]]+)\]/g,
        invalidSlug: "convert",
        maintainCase: true,
      },
    );

    expect(result).toContain('<a href="#Test-Section">Test Section</a>');
  });
});

describe("rehype-slug-link: fallback options", () => {
  it("uses heading text as slug when fallbackToHeadingText is true", async () => {
    const result = await processHtmlWithSlug(
      "<h1>Introduction</h1><p>See [text:Introduction]</p>",
      {
        fallbackToHeadingText: true,
        pattern: /\[text:([^\]]+)\]/g,
      },
    );

    expect(result).toContain('<a href="#introduction">Introduction</a>');
  });
});

describe("rehype-slug-link: Unicode normalization", () => {
  it("normalizes Unicode characters when normalizeUnicode is true", async () => {
    const result = await processHtmlWithSlug(
      "<h1>café</h1><p>Go to [link:café]</p>",
      {
        normalizeUnicode: true,
        pattern: /\[link:([^\]]+)\]/g,
      },
    );

    expect(result).toContain('<a href="#café">café</a>');
  });
});
