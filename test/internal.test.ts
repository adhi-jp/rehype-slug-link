import type { Root, Element, Text, RootData } from "hast";
import { describe, it, expect } from "vitest";
import { createProcessor } from "./helpers/test-utils.js";

type ExtendedRootData = RootData & { rehypeSlugLinkProcessed?: boolean };

describe("rehypeSlugLink internal branches", () => {
  it("should return early if tree is already processed", () => {
    // Create a tree that's already marked as processed to test early return branch
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
          children: [{ type: "text", value: "[{#test}]" }],
        },
      ],
      data: { rehypeSlugLinkProcessed: true } as ExtendedRootData,
    };

    const processor = createProcessor();
    const result = processor.runSync(tree);

    // Verify the tree is returned unchanged without processing the link
    const pElement = result.children[1] as Element;
    const textNode = pElement.children[0] as Text;

    expect(textNode.value).toBe("[{#test}]");
    expect((result.data as ExtendedRootData)?.rehypeSlugLinkProcessed).toBe(
      true,
    );
  });
});
