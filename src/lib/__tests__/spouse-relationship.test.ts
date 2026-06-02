import { describe, expect, it } from "vitest";

import {
  buildMarriageDateByPair,
  changedSpouseSaveFields,
  findSpouseRelationship,
  findSpouseRelationshipBetween,
  getSpouseId,
  normalizeMarriageDate,
} from "../spouse-relationship";
import type { Relationship } from "../types";

const rel = (partial: Partial<Relationship> & Pick<Relationship, "user_id" | "relative_id">): Relationship => ({
  id: partial.id || "rel-1",
  type: partial.type || "spouse",
  marriage_date: partial.marriage_date ?? null,
  created_at: partial.created_at || "2026-01-01T00:00:00.000Z",
  ...partial,
});

describe("spouse relationship helpers", () => {
  it("finds spouse relationships in either direction", () => {
    const relationships = [rel({ user_id: "a", relative_id: "b", marriage_date: "2010-06-10" })];
    expect(findSpouseRelationship(relationships, "a")?.marriage_date).toBe("2010-06-10");
    expect(getSpouseId(findSpouseRelationship(relationships, "b")!, "b")).toBe("a");
    expect(findSpouseRelationshipBetween(relationships, "b", "a")?.marriage_date).toBe("2010-06-10");
  });

  it("builds marriage date lookup by pair", () => {
    const map = buildMarriageDateByPair([
      rel({ user_id: "b", relative_id: "a", marriage_date: "2018-05-26" }),
    ]);
    expect(map.get("a:b")).toBe("2018-05-26");
  });

  it("normalizes marriage dates", () => {
    expect(normalizeMarriageDate(" 2018-05-26 ")).toBe("2018-05-26");
    expect(normalizeMarriageDate("")).toBeNull();
  });

  it("omits spouse fields when the modal did not change spouse data", () => {
    expect(
      changedSpouseSaveFields({
        spouseId: "spouse-1",
        marriageDate: " 2018-05-26 ",
        initialSpouseId: "spouse-1",
        initialMarriageDate: "2018-05-26",
      })
    ).toEqual({});

    expect(
      changedSpouseSaveFields({
        spouseId: "",
        marriageDate: "",
        initialSpouseId: null,
        initialMarriageDate: null,
      })
    ).toEqual({});
  });

  it("includes spouse fields when spouse or anniversary changed", () => {
    expect(
      changedSpouseSaveFields({
        spouseId: null,
        marriageDate: null,
        initialSpouseId: "spouse-1",
        initialMarriageDate: "2018-05-26",
      })
    ).toEqual({ spouseId: null, marriageDate: null });

    expect(
      changedSpouseSaveFields({
        spouseId: "spouse-1",
        marriageDate: "2020-01-02",
        initialSpouseId: "spouse-1",
        initialMarriageDate: "2018-05-26",
      })
    ).toEqual({ spouseId: "spouse-1", marriageDate: "2020-01-02" });
  });
});
