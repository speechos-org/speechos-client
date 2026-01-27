import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tts, TTSClient, DEFAULT_TTS_VOICE_ID } from "./tts.js";
import { setConfig, resetConfig } from "./config.js";
import { events } from "./events.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("tts", () => {
  beforeEach(() => {
    resetConfig();
    events.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("DEFAULT_TTS_VOICE_ID", () => {
    it("should have the correct default voice ID", () => {
      expect(DEFAULT_TTS_VOICE_ID).toBe("JBFqnCBsd6RMkjVDRZzb");
    });
  });

  describe("TTSClient", () => {
    it("should export a singleton instance", () => {
      expect(tts).toBeInstanceOf(TTSClient);
    });
  });

  describe("synthesize", () => {
    it("should throw error if API key is not configured", async () => {
      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      await expect(tts.synthesize("Hello")).rejects.toThrow(
        "API key not configured"
      );

      expect(errorHandler).toHaveBeenCalledWith({
        code: "authentication_failed",
        message: "API key not configured. Call SpeechOS.init() first.",
        phase: "synthesize",
      });
    });

    it("should make a POST request to the TTS endpoint", async () => {
      setConfig({ apiKey: "test-api-key", host: "https://test.speechos.ai" });

      const mockArrayBuffer = new ArrayBuffer(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "Content-Type": "audio/mpeg" }),
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      const result = await tts.synthesize("Hello world");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.speechos.ai/api/tts/",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Authorization": "Api-Key test-api-key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: "Hello world",
            voice_id: undefined,
            language: "en",
            user_id: undefined,
          }),
        })
      );

      expect(result.audio).toBe(mockArrayBuffer);
      expect(result.contentType).toBe("audio/mpeg");
    });

    it("should include voice_id and language in request when provided", async () => {
      setConfig({ apiKey: "test-api-key" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "Content-Type": "audio/mpeg" }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await tts.synthesize("Bonjour", { voiceId: "custom-voice", language: "fr" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            text: "Bonjour",
            voice_id: "custom-voice",
            language: "fr",
            user_id: undefined,
          }),
        })
      );
    });

    it("should include user_id from config when available", async () => {
      setConfig({ apiKey: "test-api-key", userId: "user-123" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "Content-Type": "audio/mpeg" }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await tts.synthesize("Hello");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            text: "Hello",
            voice_id: undefined,
            language: "en",
            user_id: "user-123",
          }),
        })
      );
    });

    it("should emit tts:synthesize:start and tts:synthesize:complete events", async () => {
      setConfig({ apiKey: "test-api-key" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "Content-Type": "audio/mpeg" }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const startHandler = vi.fn();
      const completeHandler = vi.fn();
      events.on("tts:synthesize:start", startHandler);
      events.on("tts:synthesize:complete", completeHandler);

      await tts.synthesize("Hello");

      expect(startHandler).toHaveBeenCalledWith({ text: "Hello" });
      expect(completeHandler).toHaveBeenCalledWith({ text: "Hello" });
    });

    it("should emit tts:error on HTTP 400 (invalid request)", async () => {
      setConfig({ apiKey: "test-api-key" });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ detail: "Text is required" }),
      });

      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      await expect(tts.synthesize("")).rejects.toThrow("Text is required");

      expect(errorHandler).toHaveBeenCalledWith({
        code: "invalid_request",
        message: "Text is required",
        phase: "synthesize",
      });
    });

    it("should emit tts:error on HTTP 402 (usage limit)", async () => {
      setConfig({ apiKey: "test-api-key" });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        statusText: "Payment Required",
        json: () => Promise.resolve({ detail: "TTS character limit exceeded" }),
      });

      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      await expect(tts.synthesize("Hello")).rejects.toThrow(
        "TTS character limit exceeded"
      );

      expect(errorHandler).toHaveBeenCalledWith({
        code: "usage_limit_exceeded",
        message: "TTS character limit exceeded",
        phase: "synthesize",
      });
    });

    it("should emit tts:error on HTTP 403 (authentication failed)", async () => {
      setConfig({ apiKey: "invalid-key" });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () => Promise.resolve({ detail: "Invalid API key" }),
      });

      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      await expect(tts.synthesize("Hello")).rejects.toThrow("Invalid API key");

      expect(errorHandler).toHaveBeenCalledWith({
        code: "authentication_failed",
        message: "Invalid API key",
        phase: "synthesize",
      });
    });

    it("should handle network errors", async () => {
      setConfig({ apiKey: "test-api-key" });

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      await expect(tts.synthesize("Hello")).rejects.toThrow("Network error");

      expect(errorHandler).toHaveBeenCalledWith({
        code: "network_error",
        message: "Network error",
        phase: "synthesize",
      });
    });
  });

  describe("stream", () => {
    it("should throw error if API key is not configured", async () => {
      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      const generator = tts.stream("Hello");

      await expect(generator.next()).rejects.toThrow("API key not configured");

      expect(errorHandler).toHaveBeenCalledWith({
        code: "authentication_failed",
        message: "API key not configured. Call SpeechOS.init() first.",
        phase: "synthesize",
      });
    });

    it("should yield chunks from the response body", async () => {
      setConfig({ apiKey: "test-api-key" });

      const chunk1 = new Uint8Array([1, 2, 3]);
      const chunk2 = new Uint8Array([4, 5, 6]);

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: chunk1 })
          .mockResolvedValueOnce({ done: false, value: chunk2 })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const chunks: Uint8Array[] = [];
      for await (const chunk of tts.stream("Hello")) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe(chunk1);
      expect(chunks[1]).toBe(chunk2);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it("should emit tts:synthesize:start and tts:synthesize:complete events", async () => {
      setConfig({ apiKey: "test-api-key" });

      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const startHandler = vi.fn();
      const completeHandler = vi.fn();
      events.on("tts:synthesize:start", startHandler);
      events.on("tts:synthesize:complete", completeHandler);

      // Consume the generator
      for await (const _ of tts.stream("Hello")) {
        // consume
      }

      expect(startHandler).toHaveBeenCalledWith({ text: "Hello" });
      expect(completeHandler).toHaveBeenCalledWith({ text: "Hello" });
    });

    it("should emit tts:error on HTTP error", async () => {
      setConfig({ apiKey: "test-api-key" });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ detail: "Invalid text" }),
      });

      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      const generator = tts.stream("Hello");

      await expect(generator.next()).rejects.toThrow("Invalid text");

      expect(errorHandler).toHaveBeenCalledWith({
        code: "invalid_request",
        message: "Invalid text",
        phase: "synthesize",
      });
    });

    it("should pass abort signal to fetch", async () => {
      setConfig({ apiKey: "test-api-key" });

      const controller = new AbortController();

      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const generator = tts.stream("Hello", { signal: controller.signal });
      await generator.next();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });
  });
});
