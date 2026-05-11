import { describe, expect, it } from "vitest";

import { canChangeFamilyUserRole, canRemoveFamilyUserAccess } from "../admin-family-users";

describe("admin family user guards", () => {
  it("prevents admins from removing their own admin access", () => {
    expect(
      canChangeFamilyUserRole({
        requesterProfileId: "profile-1",
        targetProfileId: "profile-1",
        currentRole: "ADMIN",
        nextRole: "MEMBER",
        adminCount: 2,
      }).ok
    ).toBe(false);
  });

  it("prevents demoting or removing the last joined admin", () => {
    expect(
      canChangeFamilyUserRole({
        requesterProfileId: "profile-1",
        targetProfileId: "profile-2",
        currentRole: "ADMIN",
        nextRole: "MEMBER",
        adminCount: 1,
      }).ok
    ).toBe(false);

    expect(
      canRemoveFamilyUserAccess({
        requesterProfileId: "profile-1",
        targetProfileId: "profile-2",
        targetRole: "ADMIN",
        adminCount: 1,
      }).ok
    ).toBe(false);
  });

  it("allows promoting a member and removing non-self member access", () => {
    expect(
      canChangeFamilyUserRole({
        requesterProfileId: "profile-1",
        targetProfileId: "profile-2",
        currentRole: "MEMBER",
        nextRole: "ADMIN",
        adminCount: 1,
      }).ok
    ).toBe(true);

    expect(
      canRemoveFamilyUserAccess({
        requesterProfileId: "profile-1",
        targetProfileId: "profile-2",
        targetRole: "MEMBER",
        adminCount: 1,
      }).ok
    ).toBe(true);
  });
});
