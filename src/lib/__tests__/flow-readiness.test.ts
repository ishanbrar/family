import { describe, expect, it } from "vitest";

import {
  getAddMemberDisabledReason,
  shouldCommitCompositeBlur,
  shouldPromptPostJoinLink,
} from "../flow-readiness";

describe("flow readiness helpers", () => {
  it("explains why Add Member is disabled", () => {
    expect(
      getAddMemberDisabledReason({
        firstName: "",
        lastName: "Singh",
        gender: "male",
        relativeId: "viewer",
        hasBlockingDuplicate: false,
      })
    ).toBe("First name is required.");

    expect(
      getAddMemberDisabledReason({
        firstName: "Aman",
        lastName: "Singh",
        gender: "male",
        relativeId: "viewer",
        hasBlockingDuplicate: true,
      })
    ).toBe("Review the possible duplicate or choose Add anyway.");

    expect(
      getAddMemberDisabledReason({
        firstName: "Aman",
        lastName: "Singh",
        gender: "male",
        relativeId: "viewer",
        hasBlockingDuplicate: false,
      })
    ).toBeNull();
  });

  it("prompts invited new-node users until they link to a relative", () => {
    expect(
      shouldPromptPostJoinLink({
        postJoinLinkOnlyRequired: true,
        viewerHasDirectRelationship: false,
      })
    ).toBe(true);

    expect(
      shouldPromptPostJoinLink({
        postJoinLinkOnlyRequired: true,
        viewerHasDirectRelationship: true,
      })
    ).toBe(false);
  });

  it("does not commit a compound name edit while focus stays inside it", () => {
    const inside = {} as Node;
    const currentTarget = {
      contains: (target: Node | null) => target === inside,
    };

    expect(shouldCommitCompositeBlur(currentTarget, inside)).toBe(false);
    expect(shouldCommitCompositeBlur(currentTarget, null)).toBe(true);
  });
});
