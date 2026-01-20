/**
 * LiveKit module tests
 *
 * Note: LiveKitManager integration tests that require mocking livekit-client
 * are skipped for now due to complex vi.mock hoisting issues. The Deferred
 * utility class tests work correctly without mocking.
 *
 * Token caching and auto-refresh tests use fetch mocking to test the
 * cache logic without requiring a LiveKit connection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Deferred, livekit } from "./livekit.js";
import { events } from "./events.js";
import { resetConfig, setConfig } from "./config.js";

describe("Deferred", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetConfig();
    events.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    events.clear();
  });

  describe("basic functionality", () => {
    it("should create a promise that can be resolved", async () => {
      const deferred = new Deferred<string>();

      setTimeout(() => deferred.resolve("test value"), 0);
      vi.advanceTimersByTime(0);

      await expect(deferred.promise).resolves.toBe("test value");
    });

    it("should create a promise that can be rejected", async () => {
      const deferred = new Deferred<string>();

      setTimeout(() => deferred.reject(new Error("test error")), 0);
      vi.advanceTimersByTime(0);

      await expect(deferred.promise).rejects.toThrow("test error");
    });

    it("should track settled state after resolve", () => {
      const deferred = new Deferred<string>();

      expect(deferred.isSettled).toBe(false);
      deferred.resolve("value");
      expect(deferred.isSettled).toBe(true);
    });

    it("should track settled state after reject", async () => {
      const deferred = new Deferred<void>();

      expect(deferred.isSettled).toBe(false);
      deferred.reject(new Error("error"));
      expect(deferred.isSettled).toBe(true);

      await expect(deferred.promise).rejects.toThrow("error");
    });
  });

  describe("double-settlement prevention", () => {
    it("should ignore second resolve after first resolve", async () => {
      const deferred = new Deferred<string>();

      deferred.resolve("first");
      deferred.resolve("second");

      await expect(deferred.promise).resolves.toBe("first");
    });

    it("should ignore reject after resolve", async () => {
      const deferred = new Deferred<string>();

      deferred.resolve("value");
      deferred.reject(new Error("error"));

      await expect(deferred.promise).resolves.toBe("value");
    });

    it("should ignore resolve after reject", async () => {
      const deferred = new Deferred<string>();

      deferred.reject(new Error("error"));
      deferred.resolve("value");

      await expect(deferred.promise).rejects.toThrow("error");
    });
  });

  describe("timeout functionality", () => {
    it("should reject with error after timeout expires", async () => {
      const deferred = new Deferred<string>();
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      deferred.setTimeout(
        1000,
        "Operation timed out",
        "timeout_code",
        "timeout"
      );

      vi.advanceTimersByTime(1000);

      await expect(deferred.promise).rejects.toThrow("Operation timed out");

      consoleSpy.mockRestore();
    });

    it("should emit error event when timeout occurs", async () => {
      const deferred = new Deferred<string>();
      const errorListener = vi.fn();
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      events.on("error", errorListener);
      deferred.setTimeout(500, "Test timeout", "test_timeout", "timeout");

      vi.advanceTimersByTime(500);

      try {
        await deferred.promise;
      } catch {
        // Expected
      }

      expect(errorListener).toHaveBeenCalledWith({
        code: "test_timeout",
        message: "Test timeout",
        source: "timeout",
      });

      consoleSpy.mockRestore();
    });

    it("should not reject if resolved before timeout", async () => {
      const deferred = new Deferred<string>();

      deferred.setTimeout(1000, "Should not happen", "timeout", "timeout");
      deferred.resolve("success");

      vi.advanceTimersByTime(2000);

      await expect(deferred.promise).resolves.toBe("success");
    });

    it("should clear timeout when resolved", () => {
      const deferred = new Deferred<string>();
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      deferred.setTimeout(1000, "Timeout", "code", "timeout");
      deferred.resolve("value");

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("type safety", () => {
    it("should work with void type", async () => {
      const deferred = new Deferred<void>();
      deferred.resolve();
      await expect(deferred.promise).resolves.toBeUndefined();
    });

    it("should work with object type", async () => {
      const deferred = new Deferred<{ id: number; name: string }>();
      deferred.resolve({ id: 1, name: "test" });
      await expect(deferred.promise).resolves.toEqual({ id: 1, name: "test" });
    });

    it("should work with number type", async () => {
      const deferred = new Deferred<number>();
      deferred.resolve(42);
      await expect(deferred.promise).resolves.toBe(42);
    });
  });

  describe("command result type", () => {
    it("should work with CommandResult type", async () => {
      const deferred = new Deferred<{
        name: string;
        arguments: Record<string, unknown>;
      } | null>();
      const result = { name: "search", arguments: { query: "hello" } };
      deferred.resolve(result);
      await expect(deferred.promise).resolves.toEqual(result);
    });

    it("should work with null CommandResult (no match)", async () => {
      const deferred = new Deferred<{
        name: string;
        arguments: Record<string, unknown>;
      } | null>();
      deferred.resolve(null);
      await expect(deferred.promise).resolves.toBeNull();
    });

    it("should reject with timeout for command requests", async () => {
      const deferred = new Deferred<{
        name: string;
        arguments: Record<string, unknown>;
      } | null>();
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      deferred.setTimeout(
        15000,
        "Command request timed out. Please try again.",
        "command_timeout",
        "timeout"
      );

      vi.advanceTimersByTime(15000);

      await expect(deferred.promise).rejects.toThrow(
        "Command request timed out"
      );

      consoleSpy.mockRestore();
    });
  });
});

describe("Token Caching and Auto-Refresh", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let tokenCounter: number;
  const originalFetch = global.fetch;

  const createMockTokenResponse = () => ({
    token: `test-token-${tokenCounter++}`,
    ws_url: "wss://test.livekit.cloud",
    room: `room-${tokenCounter}`,
    identity: "test-user",
  });

  beforeEach(() => {
    vi.useFakeTimers();
    tokenCounter = 1;

    // Set up config with API key
    setConfig({ apiKey: "test-api-key", debug: false });

    // Mock fetch
    fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(createMockTokenResponse()),
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    // Stop any existing auto-refresh
    livekit.stopAutoRefresh();

    // Invalidate any existing cache
    livekit.invalidateTokenCache();

    events.clear();
  });

  afterEach(() => {
    // Stop auto-refresh first to prevent infinite timer loops
    livekit.stopAutoRefresh();
    vi.useRealTimers();
    livekit.invalidateTokenCache();
    resetConfig();
    events.clear();
    global.fetch = originalFetch;
  });

  describe("prefetchToken", () => {
    it("should fetch a token from the server", async () => {
      const token = await livekit.prefetchToken();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(token.token).toBe("test-token-1");
    });

    it("should cache the token for subsequent calls", async () => {
      const token1 = await livekit.prefetchToken();
      const token2 = await livekit.prefetchToken();

      // Should only fetch once
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // Both should return the same cached token
      expect(token1.token).toBe(token2.token);
    });

    it("should deduplicate concurrent prefetch calls", async () => {
      // Start two prefetches at the same time
      const promise1 = livekit.prefetchToken();
      const promise2 = livekit.prefetchToken();

      const [token1, token2] = await Promise.all([promise1, promise2]);

      // Should only fetch once
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(token1.token).toBe(token2.token);
    });

    it("should return cached token within TTL (4 minutes)", async () => {
      const token1 = await livekit.prefetchToken();

      // Advance time by 3 minutes (within 4 minute TTL)
      vi.advanceTimersByTime(3 * 60 * 1000);

      const token2 = await livekit.prefetchToken();

      // Should still use cached token
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(token1.token).toBe(token2.token);
    });

    it("should fetch fresh token after TTL expires (4 minutes)", async () => {
      const token1 = await livekit.prefetchToken();

      // Advance time past 4 minute TTL
      vi.advanceTimersByTime(4 * 60 * 1000 + 1);

      const token2 = await livekit.prefetchToken();

      // Should fetch a new token
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(token1.token).not.toBe(token2.token);
    });
  });

  describe("invalidateTokenCache", () => {
    it("should clear the cached token", async () => {
      await livekit.prefetchToken();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      livekit.invalidateTokenCache();

      await livekit.prefetchToken();
      // Should fetch again after invalidation
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("startAutoRefresh", () => {
    it("should invalidate the current token and fetch fresh one", async () => {
      // Get a cached token first
      const token1 = await livekit.prefetchToken();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Start auto-refresh (simulates after command completes)
      livekit.startAutoRefresh();

      // Let the prefetch in startAutoRefresh complete
      await vi.advanceTimersByTimeAsync(10);

      // Should have fetched a new token (invalidate + prefetch)
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Stop auto-refresh before checking to prevent more timers
      livekit.stopAutoRefresh();

      // Getting token again should use the new cached token
      const token2 = await livekit.prefetchToken();
      expect(token2.token).not.toBe(token1.token);
    });

    it("should immediately fetch a fresh token for next command", async () => {
      livekit.startAutoRefresh();

      // Let the async prefetch complete
      await vi.advanceTimersByTimeAsync(10);

      // Should have fetched a token
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Stop auto-refresh before checking
      livekit.stopAutoRefresh();

      // Token should be cached for next command
      const token = await livekit.prefetchToken();
      expect(fetchMock).toHaveBeenCalledTimes(1); // No additional fetch
      expect(token.token).toBe("test-token-1");
    });
  });

  describe("stopAutoRefresh", () => {
    it("should stop scheduled token refreshes", async () => {
      livekit.startAutoRefresh();

      // Let initial prefetch complete
      await vi.advanceTimersByTimeAsync(10);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Stop auto-refresh
      livekit.stopAutoRefresh();

      // Advance past when refresh would have occurred
      vi.advanceTimersByTime(5 * 60 * 1000);

      // Should NOT have fetched another token
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("one token per command flow", () => {
    it("should use different tokens for consecutive commands", async () => {
      // Simulate: user expands widget -> prefetch token
      const token1 = await livekit.prefetchToken();
      expect(token1.token).toBe("test-token-1");

      // Simulate: command completes -> startAutoRefresh
      // This invalidates token1 and fetches token2
      livekit.startAutoRefresh();
      await vi.advanceTimersByTimeAsync(10);
      livekit.stopAutoRefresh();

      // Next command should get a fresh token
      const token2 = await livekit.prefetchToken();
      expect(token2.token).toBe("test-token-2");
      expect(token2.token).not.toBe(token1.token);

      // Simulate: second command completes
      livekit.startAutoRefresh();
      await vi.advanceTimersByTimeAsync(10);
      livekit.stopAutoRefresh();

      // Third command should get another fresh token
      const token3 = await livekit.prefetchToken();
      expect(token3.token).toBe("test-token-3");
      expect(token3.token).not.toBe(token2.token);
    });

    it("should handle rapid consecutive commands", async () => {
      // First command
      await livekit.prefetchToken();
      livekit.startAutoRefresh();
      await vi.advanceTimersByTimeAsync(10);
      livekit.stopAutoRefresh();

      // Second command immediately after
      await livekit.prefetchToken();
      livekit.startAutoRefresh();
      await vi.advanceTimersByTimeAsync(10);
      livekit.stopAutoRefresh();

      // Third command immediately after
      await livekit.prefetchToken();
      livekit.startAutoRefresh();
      await vi.advanceTimersByTimeAsync(10);
      livekit.stopAutoRefresh();

      // Should have fetched 4 tokens total:
      // 1. Initial prefetch
      // 2. After first command
      // 3. After second command
      // 4. After third command
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe("computer sleep handling", () => {
    it("should fetch fresh token if cache expired during sleep", async () => {
      await livekit.prefetchToken();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Simulate computer sleep: time jumps forward past TTL
      vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

      // Token should be expired, need fresh one
      await livekit.prefetchToken();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should not block if startAutoRefresh prefetch fails", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Make fetch fail
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      // startAutoRefresh should not throw
      livekit.startAutoRefresh();

      // Let the async operations complete
      await vi.advanceTimersByTimeAsync(10);

      // Should have attempted fetch
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Stop before more retries
      livekit.stopAutoRefresh();

      consoleSpy.mockRestore();
    });
  });
});
