import { describe, it, expect } from "vitest";
import { processHtml } from "./helpers/test-utils.js";

describe("rehype-slug-link: core functionality", () => {
  it("converts basic link syntax to heading links", async () => {
    const html = '<h1 id="foo-bar">Foo Bar</h1><p>Go to [{#foo-bar}]</p>';
    const result = await processHtml(html);

    expect(result).toBe(
      '<h1 id="foo-bar">Foo Bar</h1><p>Go to <a href="#foo-bar">Foo Bar</a></p>',
    );
  });

  it("handles multiple heading links in the same paragraph", async () => {
    const html =
      '<h1 id="first">First</h1><h2 id="second">Second</h2><p>See [{#first}] and [{#second}]</p>';
    const result = await processHtml(html);

    expect(result).toBe(
      '<h1 id="first">First</h1><h2 id="second">Second</h2><p>See <a href="#first">First</a> and <a href="#second">Second</a></p>',
    );
  });

  it("preserves unmatched link syntax unchanged", async () => {
    const html = '<h1 id="foo">Foo</h1><p>Go to [{#nonexistent}]</p>';
    const result = await processHtml(html);

    expect(result).toBe('<h1 id="foo">Foo</h1><p>Go to [{#nonexistent}]</p>');
  });

  it("processes links in nested HTML elements", async () => {
    const html = '<h1 id="test">Test</h1><div><p>Nested [{#test}]</p></div>';
    const result = await processHtml(html);

    expect(result).toBe(
      '<h1 id="test">Test</h1><div><p>Nested <a href="#test">Test</a></p></div>',
    );
  });

  it("supports custom link patterns", async () => {
    const result = await processHtml(
      '<h1 id="introduction">Introduction</h1><p>See [link:introduction]</p>',
      { pattern: /\[link:([^\]]+)\]/g },
    );

    expect(result).toBe(
      '<h1 id="introduction">Introduction</h1><p>See <a href="#introduction">Introduction</a></p>',
    );
  });
});

describe("rehype-slug-link: HTML formatting preservation", () => {
  it("processes multiline HTML with line breaks and indentation", async () => {
    const input = `
      <h1 id="foo-bar">Foo Bar</h1>
      <p>
        Go to [{#foo-bar}]
        and also
        [{#foo-bar}]
      </p>
    `;
    const result = await processHtml(input);

    // Verify both links are processed correctly
    expect(result).toContain('<h1 id="foo-bar">Foo Bar</h1>');
    expect(result).toContain('<a href="#foo-bar">Foo Bar</a>');
  });

  it("preserves original indentation and line breaks in output", async () => {
    const input = `\n  <h1 id=\"foo-bar\">Foo Bar</h1>\n  <p>\n    Go to [{#foo-bar}]\n    and also\n    [{#foo-bar}]\n  </p>\n`;
    const expected = `\n  <h1 id=\"foo-bar\">Foo Bar</h1>\n  <p>\n    Go to <a href=\"#foo-bar\">Foo Bar</a>\n    and also\n    <a href=\"#foo-bar\">Foo Bar</a>\n  </p>\n`;

    const result = await processHtml(input);
    expect(result).toBe(expected);
  });
});
