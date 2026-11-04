import type { Root, Element, Text, Comment } from "hast";
import { describe, it, expect } from "vitest";
import { createProcessor } from "./helpers/test-utils.js";

describe("rehypeSlugLink internal branches", () => {
  it("should handle extractText with node that has no text and no children", () => {
    // Create a heading with only a comment node (no text, no children property)
    const processor = createProcessor();
    const commentNode: Comment = {
      type: "comment",
      value: "comment",
    };

    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "test" },
          children: [commentNode],
        },
      ],
    };

    const result = processor.runSync(tree);
    // Should handle gracefully without error
    expect(result.children[0].type).toBe("element");
  });

  it("should skip empty text nodes", () => {
    // Test shouldSkipTextNode's !node.value condition
    const processor = createProcessor();
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "test" },
          children: [{ type: "text", value: "Test" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [
            { type: "text", value: "" }, // Empty text node
            { type: "text", value: "normal text" },
          ],
        },
      ],
    };

    const result = processor.runSync(tree);
    const pElement = result.children[1] as Element;
    // Empty text node should be preserved (not processed)
    expect(pElement.children.length).toBe(2);
    expect((pElement.children[0] as Text).value).toBe("");
  });

  it("should handle match at the start of text", () => {
    // Test convertLinkSyntaxInText when match is at index 0
    const processor = createProcessor();
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "test" },
          children: [{ type: "text", value: "Test" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "[{#test}] and more text" }],
        },
      ],
    };

    const result = processor.runSync(tree);
    const pElement = result.children[1] as Element;
    const linkElement = pElement.children[0] as Element;
    expect(linkElement.tagName).toBe("a");
    expect(linkElement.properties?.href).toBe("#test");
    // Text after match should be preserved
    const textAfter = pElement.children[1] as Text;
    expect(textAfter.value).toBe(" and more text");
  });

  it("should handle match at the end of text", () => {
    // Test convertLinkSyntaxInText when match is at the end
    const processor = createProcessor();
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "test" },
          children: [{ type: "text", value: "Test" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Text before [{#test}]" }],
        },
      ],
    };

    const result = processor.runSync(tree);
    const pElement = result.children[1] as Element;
    const textBefore = pElement.children[0] as Text;
    expect(textBefore.value).toBe("Text before ");
    const linkElement = pElement.children[1] as Element;
    expect(linkElement.tagName).toBe("a");
    expect(linkElement.properties?.href).toBe("#test");
  });

  it("should handle consecutive matches", () => {
    // Test convertLinkSyntaxInText with multiple consecutive matches
    const processor = createProcessor();
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "test1" },
          children: [{ type: "text", value: "Test 1" }],
        },
        {
          type: "element",
          tagName: "h2",
          properties: { id: "test2" },
          children: [{ type: "text", value: "Test 2" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "[{#test1}][{#test2}]" }],
        },
      ],
    };

    const result = processor.runSync(tree);
    const pElement = result.children[2] as Element;
    expect(pElement.children.length).toBe(2);
    const link1 = pElement.children[0] as Element;
    const link2 = pElement.children[1] as Element;
    expect(link1.tagName).toBe("a");
    expect(link1.properties?.href).toBe("#test1");
    expect(link2.tagName).toBe("a");
    expect(link2.properties?.href).toBe("#test2");
  });

  it("should handle extractText with empty children array", () => {
    // Test extractText with element that has empty children array
    const processor = createProcessor();
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "test" },
          children: [], // Empty children array
        },
      ],
    };

    const result = processor.runSync(tree);
    // Should handle gracefully without error
    expect(result.children[0].type).toBe("element");
  });

  it("should link with a wrapped pattern (no capture group)", () => {
    const processor = createProcessor({
      pattern: /test/g,
      patternGroupMissing: "wrap", // This wraps the pattern to /(test)/g
    });

    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "test" },
          children: [{ type: "text", value: "Test" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "test" }],
        },
      ],
    };

    const result = processor.runSync(tree);
    // The wrapped pattern will match "test" and find heading with id "test"
    // So it should create a link
    const pElement = result.children[1] as Element;
    const linkElement = pElement.children[0] as Element;
    expect(linkElement.tagName).toBe("a");
    expect(linkElement.properties?.href).toBe("#test");
  });

  it("should return null from createLinkNode when heading not found", () => {
    // Test createLinkNode returns null when slug doesn't match any heading
    const processor = createProcessor();
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "existing" },
          children: [{ type: "text", value: "Existing" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "[{#nonexistent}]" }],
        },
      ],
    };

    const result = processor.runSync(tree);
    const pElement = result.children[1] as Element;
    const textNode = pElement.children[0] as Text;
    // Should preserve original syntax when heading not found
    expect(textNode.value).toBe("[{#nonexistent}]");
  });

  it("should handle normalizeUnicode case-insensitive matching in createLinkNode", () => {
    // With normalizeUnicode the reference is matched case-insensitively
    // against normalized ids and heading text, while the link text keeps
    // the heading's original text.
    const processor = createProcessor({
      normalizeUnicode: true,
    });

    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: { id: "cafe" },
          children: [{ type: "text", value: "Café" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "[{#CAFE}]" }], // Different case
        },
      ],
    };

    const result = processor.runSync(tree);
    const pElement = result.children[1] as Element;
    const linkElement = pElement.children[0] as Element;
    // Should match case-insensitively when normalizeUnicode is enabled
    expect(linkElement.tagName).toBe("a");
    expect(linkElement.properties?.href).toBe("#cafe");
    expect((linkElement.children[0] as Text).value).toBe("Café");
  });

  it("should prevent reprocessing of already processed trees", async () => {
    // Test that already processed trees are not reprocessed
    const processor = createProcessor();

    const firstResult = await processor.process(
      '<h1 id="test">Test</h1><p>[{#test}]</p>',
    );
    const secondResult = await processor.process(firstResult.value.toString());

    expect(secondResult.value.toString()).toBe(
      '<h1 id="test">Test</h1><p><a href="#test">Test</a></p>',
    );
  });
});
