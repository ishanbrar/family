import { describe, expect, it, vi } from "vitest";

import {
  normalizeLoginEmail,
  resolvePostAuthRedirect,
  type PendingIntentPayload,
} from "../login-flow";

describe("login flow helpers", () => {
  it("normalizes email identifiers before password auth", () => {
    expect(normalizeLoginEmail("  GPB@SIKHOMODE.ORG ")).toBe("gpb@sikhomode.org");
  });

  it("redirects existing users when the deferred setup check fails", async () => {
    const result = await resolvePostAuthRedirect({
      fallbackRedirect: "/dashboard",
      consumePendingIntent: () => Promise.reject(new Error("Setup check timed out.")),
      completeDeferredSetup: vi.fn(),
    });

    expect(result.redirectPath).toBe("/dashboard");
    expect(result.setupCheckFailed).toBe(true);
    expect(result.pendingIntent).toBeNull();
    expect(result.setupError).toBeNull();
  });

  it("preserves invite-code redirects when the deferred setup check fails", async () => {
    const result = await resolvePostAuthRedirect({
      fallbackRedirect: "/join?code=ABC123",
      consumePendingIntent: () => Promise.reject(new Error("network error")),
      completeDeferredSetup: vi.fn(),
    });

    expect(result.redirectPath).toBe("/join?code=ABC123");
  });

  it("runs deferred create setup when a pending create intent exists", async () => {
    const intent: PendingIntentPayload = {
      mode: "create",
      first_name: "Gurpreet",
      last_name: "Brar",
      gender: "male",
      family_name: "Brar Family",
    };
    const completeDeferredSetup = vi.fn().mockResolvedValue("/dashboard");

    const result = await resolvePostAuthRedirect({
      fallbackRedirect: "/dashboard",
      consumePendingIntent: () => Promise.resolve(intent),
      completeDeferredSetup,
    });

    expect(completeDeferredSetup).toHaveBeenCalledWith({
      ...intent,
      invite_code: null,
      phone_number: null,
    });
    expect(result.redirectPath).toBe("/dashboard");
    expect(result.pendingIntent).toBeNull();
  });

  it("runs deferred join setup and redirects to the invite claim flow", async () => {
    const intent: PendingIntentPayload = {
      mode: "join",
      first_name: "Gurpreet",
      last_name: "Brar",
      gender: "male",
      invite_code: "BRAR1234",
    };

    const result = await resolvePostAuthRedirect({
      fallbackRedirect: "/dashboard",
      consumePendingIntent: () => Promise.resolve(intent),
      completeDeferredSetup: vi.fn().mockResolvedValue("/join?code=BRAR1234"),
    });

    expect(result.redirectPath).toBe("/join?code=BRAR1234");
  });

  it("keeps the pending intent available when required deferred setup fails", async () => {
    const intent: PendingIntentPayload = {
      mode: "join",
      first_name: "Gurpreet",
      last_name: "Brar",
      invite_code: "BRAR1234",
    };

    const result = await resolvePostAuthRedirect({
      fallbackRedirect: "/join?code=BRAR1234",
      consumePendingIntent: () => Promise.resolve(intent),
      completeDeferredSetup: () => Promise.reject(new Error("Profile setup failed")),
    });

    expect(result.redirectPath).toBe("/join?code=BRAR1234");
    expect(result.pendingIntent).toEqual({
      ...intent,
      family_name: null,
      gender: null,
      phone_number: null,
    });
    expect(result.setupError?.message).toBe("Profile setup failed");
  });
});
