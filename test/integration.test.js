import { describe, it, expect } from "vitest";
import { processHtmlWithSlug } from "./helpers/test-utils.js";

describe("rehype-slug-link: HAST type consistency", () => {
  it("properly handles Element nodes with children property", async () => {
    const result = await processHtmlWithSlug(
      "<h1>Test heading</h1><p>[{#test-heading}]</p>",
    );

    expect(result).toContain('href="#test-heading"');
  });

  it("handles Text nodes without children property", async () => {
    const result = await processHtmlWithSlug(
      "<h1>Plain text heading</h1><p>[{#plain-text-heading}]</p>",
    );

    expect(result).toBe(
      '<h1 id="plain-text-heading">Plain text heading</h1><p><a href="#plain-text-heading">Plain text heading</a></p>',
    );
  });

  it("handles Comment nodes correctly", async () => {
    const result = await processHtmlWithSlug(
      "<!-- This is a comment --><h1>Heading with comment</h1><p>[{#heading-with-comment}]</p>",
    );

    expect(result).toContain(
      '<h1 id="heading-with-comment">Heading with comment</h1>',
    );
    expect(result).toContain(
      '<a href="#heading-with-comment">Heading with comment</a>',
    );
  });

  it("properly type-checks Parent nodes in visit callbacks", async () => {
    const result = await processHtmlWithSlug(
      "<div><h1>Nested heading</h1></div><p>[{#nested-heading}]</p>",
    );

    expect(result).toContain('href="#nested-heading"');
  });
});

describe("rehype-slug-link: plugin integration", () => {
  it("works correctly with rehype-slug for automatic slug generation", async () => {
    const result = await processHtmlWithSlug(
      "<h1>Automatic Slug Generation</h1><p>See [{#automatic-slug-generation}]</p>",
    );

    expect(result).toContain('id="automatic-slug-generation"');
    expect(result).toContain('href="#automatic-slug-generation"');
  });

  it("handles mixed manual and automatic slug scenarios", async () => {
    const result = await processHtmlWithSlug(
      '<h1 id="manual">Manual Slug</h1><h2>Auto Slug</h2><p>Links: [{#manual}] and [{#auto-slug}]</p>',
    );

    expect(result).toContain('<a href="#manual">Manual Slug</a>');
    expect(result).toContain('<a href="#auto-slug">Auto Slug</a>');
  });
});
