import { describe, it, expect } from "vitest";
import { processHtml } from "./helpers/test-utils.js";

describe("rehype-slug-link: edge cases", () => {
  it("handles text with no pattern matches", async () => {
    const result = await processHtml(
      '<h1 id="test">Test</h1><p>Just plain text</p>',
    );

    expect(result).toBe('<h1 id="test">Test</h1><p>Just plain text</p>');
  });

  it("processes text that is entirely one match", async () => {
    const result = await processHtml('<h1 id="test">Test</h1><p>[{#test}]</p>');

    expect(result).toBe(
      '<h1 id="test">Test</h1><p><a href="#test">Test</a></p>',
    );
  });

  it("skips text nodes inside anchor tags", async () => {
    const result = await processHtml(
      '<h1 id="test">Test</h1><p><a href="#existing">[{#test}]</a></p>',
    );

    expect(result).toBe(
      '<h1 id="test">Test</h1><p><a href="#existing">[{#test}]</a></p>',
    );
  });

  it("handles empty heading text gracefully", async () => {
    const result = await processHtml(
      '<h1 id=""> <img alt="" /><br /></h1><p>[{#}]</p>',
    );

    expect(result).toContain('<h1 id="">');
    expect(result).toContain("<p>[{#}]</p>");
  });
});

describe("rehype-slug-link: pattern matching edge cases", () => {
  it("handles infinite loop protection for zero-width matches", async () => {
    const result = await processHtml("<h1>Test</h1><p>aaaa</p>", {
      pattern: /a*/g,
      patternGroupMissing: "wrap",
    });

    expect(result).toContain("<p>aaaa</p>");
  });

  it("breaks loop when pattern.lastIndex exceeds text length", async () => {
    const result = await processHtml("<h1>Test</h1><p>abc</p>", {
      pattern: /()/g,
      patternGroupMissing: "wrap",
    });

    expect(result).toContain("<p>abc</p>");
  });

  it("handles custom pattern with no matches", async () => {
    const result = await processHtml(
      '<h1 id="test">Test</h1><p>Text with no pattern matches</p>',
      { pattern: /nomatch/g },
    );

    expect(result).toBe(
      '<h1 id="test">Test</h1><p>Text with no pattern matches</p>',
    );
  });
});
