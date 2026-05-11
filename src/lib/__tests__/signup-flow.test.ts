import { describe, expect, it } from "vitest";

import {
  CREATE_FAMILY_SIGNUP_PATH,
  JOIN_FAMILY_SIGNUP_PATH,
  joinFamilySignupPath,
  loginPathForInvite,
  normalizeInviteCode,
} from "../signup-flow";

describe("signup flow helpers", () => {
  it("uses join family as the default signup path", () => {
    expect(JOIN_FAMILY_SIGNUP_PATH).toBe("/signup");
    expect(joinFamilySignupPath()).toBe("/signup");
  });

  it("keeps create family on a separate path", () => {
    expect(CREATE_FAMILY_SIGNUP_PATH).toBe("/signup/create");
  });

  it("preserves invite codes across signup and login links", () => {
    expect(normalizeInviteCode(" brar1234 ")).toBe("BRAR1234");
    expect(joinFamilySignupPath(" brar1234 ")).toBe("/signup?code=BRAR1234");
    expect(loginPathForInvite(" brar1234 ")).toBe("/login?code=BRAR1234");
  });
});
