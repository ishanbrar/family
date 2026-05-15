import { describe, expect, it } from "vitest";
import { resolveThemeModeFromStorage } from "../theme";

describe("resolveThemeModeFromStorage", () => {
  it("defaults to light when the user has not explicitly chosen a mode", () => {
    expect(resolveThemeModeFromStorage("dark", false)).toBe("light");
    expect(resolveThemeModeFromStorage(null, false)).toBe("light");
  });

  it("honors dark only after an explicit theme choice", () => {
    expect(resolveThemeModeFromStorage("dark", true)).toBe("dark");
  });

  it("honors an explicit light choice", () => {
    expect(resolveThemeModeFromStorage("light", true)).toBe("light");
  });
});
