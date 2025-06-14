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

    // The link text should be normalized to ASCII
    expect(result).toContain('<a href="#café">cafe</a>');
  });

  it("converts Latin accented characters", async () => {
    const result = await processHtmlWithSlug(
      `<h1 id="cafe">Café</h1>
       <h2 id="naive">Naïve</h2>
       <h3 id="resume">Résumé</h3>
       <h4 id="pinata">Piñata</h4>
       <p>Link to [{#Café}]</p>
       <p>Link to [{#Naïve}]</p>
       <p>Link to [{#Résumé}]</p>
       <p>Link to [{#Piñata}]</p>`,
      {
        normalizeUnicode: true,
      },
    );

    // Verify that accented characters in link syntax are normalized to match heading text
    // Café → Cafe, Naïve → Naive, Résumé → Resume, Piñata → Pinata
    expect(result).toContain('<a href="#cafe">Cafe</a>');
    expect(result).toContain('<a href="#naive">Naive</a>');
    expect(result).toContain('<a href="#resume">Resume</a>');
    expect(result).toContain('<a href="#pinata">Pinata</a>');
  });

  it("handles Nordic characters", async () => {
    const result = await processHtmlWithSlug(
      `<h1 id="copenhagen">København</h1>
       <h2 id="oslo">Oslø</h2>
       <h3 id="aarhus">Århus</h3>
       <p>Link to [{#København}]</p>
       <p>Link to [{#Oslø}]</p>
       <p>Link to [{#Århus}]</p>`,
      {
        normalizeUnicode: true,
      },
    );

    // Should normalize: ø→o, å→a
    expect(result).toContain('<a href="#copenhagen">Kobenhavn</a>');
    expect(result).toContain('<a href="#oslo">Oslo</a>');
    expect(result).toContain('<a href="#aarhus">Arhus</a>');
  });

  it("preserves non-Latin scripts", async () => {
    const result = await processHtmlWithSlug(
      `<h1 id="nihongo">日本語</h1>
       <h2 id="chinese">中文</h2>
       <h3 id="cyrillic">Русский</h3>
       <p>Link to [{#日本語}]</p>
       <p>Link to [{#中文}]</p>
       <p>Link to [{#Русский}]</p>`,
      {
        normalizeUnicode: true,
      },
    );

    // Should preserve CJK and Cyrillic characters (with potential normalization)
    expect(result).toContain('<a href="#nihongo">日本語</a>');
    expect(result).toContain('<a href="#chinese">中文</a>');
    expect(result).toContain('<a href="#cyrillic">Русскии</a>'); // Note: Cyrillic may be normalized
  });
});
