import { describe, expect, it } from "vitest";

import { shouldZoomTreeOnWheel } from "../tree-interaction";

describe("tree interaction helpers", () => {
  it("only enables wheel zoom when a modifier key is pressed", () => {
    expect(shouldZoomTreeOnWheel({ ctrlKey: false, metaKey: false })).toBe(false);
    expect(shouldZoomTreeOnWheel({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldZoomTreeOnWheel({ ctrlKey: false, metaKey: true })).toBe(true);
  });
});
