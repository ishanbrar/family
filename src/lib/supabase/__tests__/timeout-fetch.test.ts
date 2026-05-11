import { afterEach, describe, expect, it, vi } from "vitest";

import { createTimeoutFetch } from "../timeout-fetch";

describe("createTimeoutFetch", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("aborts a hanging request at the configured timeout", async () => {
    vi.useFakeTimers();
    const hangingFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(init.signal?.reason || new Error("aborted"));
        });
      });
    });
    vi.stubGlobal("fetch", hangingFetch);

    const timeoutFetch = createTimeoutFetch("Supabase Auth", 25);
    const request = timeoutFetch("https://example.test/auth");
    const expectation = expect(request).rejects.toThrow("Supabase Auth timed out after 25ms.");

    await vi.advanceTimersByTimeAsync(25);
    await expectation;
    expect(hangingFetch).toHaveBeenCalledOnce();
  });

  it("passes through successful responses", async () => {
    const response = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(createTimeoutFetch("Supabase Auth", 25)("https://example.test/auth")).resolves.toBe(response);
  });
});
