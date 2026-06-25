import { describe, expect, it } from "vitest";

import { getRelationDisplayLabel } from "../relation-labels";

describe("relation labels", () => {
  it("supports Spanish relationship labels", () => {
    expect(getRelationDisplayLabel("Mother", "female", "es")).toBe("Madre");
    expect(getRelationDisplayLabel("Father", "male", "es")).toBe("Padre");
    expect(getRelationDisplayLabel("First Cousin", null, "es")).toBe("Primo/a");
    expect(getRelationDisplayLabel("Paternal Uncle (elder)", "male", "es")).toBe("Tio paterno mayor");
  });

  it("supports French relationship labels", () => {
    expect(getRelationDisplayLabel("Mother", "female", "fr")).toBe("Mere");
    expect(getRelationDisplayLabel("Father", "male", "fr")).toBe("Pere");
    expect(getRelationDisplayLabel("First Cousin", null, "fr")).toBe("Cousin(e)");
    expect(getRelationDisplayLabel("Paternal Uncle (younger)", "male", "fr")).toBe("Oncle paternel cadet");
  });

  it("supports Telugu relationship labels", () => {
    expect(getRelationDisplayLabel("Mother", "female", "telugu")).toBe("Amma");
    expect(getRelationDisplayLabel("Father", "male", "telugu")).toBe("Nanna");
    expect(getRelationDisplayLabel("Maternal Uncle", "male", "telugu")).toBe("Mamayya");
    expect(getRelationDisplayLabel("Paternal Uncle (elder)", "male", "telugu")).toBe("Pedda Nanna");
  });

  it("keeps existing English simplification behavior", () => {
    expect(getRelationDisplayLabel("Maternal Aunt", "female", "en")).toBe("Aunt");
    expect(getRelationDisplayLabel("Paternal Uncle", "male", "en")).toBe("Uncle");
  });
});
