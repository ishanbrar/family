export const SUPABASE_REQUEST_TIMEOUT_MS = 30000;

function getRequestSignal(input: Parameters<typeof fetch>[0]): AbortSignal | null {
  if (typeof Request === "undefined" || !(input instanceof Request)) return null;
  return input.signal;
}

export function createTimeoutFetch(
  label = "Supabase request",
  timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS
): typeof fetch {
  return async (input, init) => {
    const timeoutController = new AbortController();
    const requestSignal = getRequestSignal(input);
    const initSignal = init?.signal || null;
    const upstreamSignals = [requestSignal, initSignal].filter(Boolean) as AbortSignal[];
    let timedOut = false;

    const abortFromUpstream = (signal: AbortSignal) => {
      if (!timeoutController.signal.aborted) {
        timeoutController.abort(signal.reason);
      }
    };

    for (const signal of upstreamSignals) {
      if (signal.aborted) {
        abortFromUpstream(signal);
        break;
      }
      signal.addEventListener("abort", () => abortFromUpstream(signal), { once: true });
    }

    const timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort(new Error(`${label} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: timeoutController.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new Error(`${label} timed out after ${timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}
