import { describe, it, expect, beforeEach } from "vitest";
import { SpeechOSEventEmitter } from "./events.js";

describe("SpeechOSEventEmitter", () => {
  let emitter: SpeechOSEventEmitter;

  beforeEach(() => {
    emitter = new SpeechOSEventEmitter();
  });

  describe("on/emit", () => {
    it("should emit events to listeners", () => {
      let received: { action: string } | null = null;

      emitter.on("action:select", (data) => {
        received = data;
      });

      emitter.emit("action:select", { action: "dictate" });

      expect(received).toEqual({ action: "dictate" });
    });

    it("should support multiple listeners for same event", () => {
      let count = 0;

      emitter.on("widget:show", () => count++);
      emitter.on("widget:show", () => count++);

      emitter.emit("widget:show", undefined);

      expect(count).toBe(2);
    });

    it("should not call listeners for different events", () => {
      let called = false;

      emitter.on("widget:show", () => {
        called = true;
      });

      emitter.emit("widget:hide", undefined);

      expect(called).toBe(false);
    });
  });

  describe("unsubscribe", () => {
    it("should remove listener via returned unsubscribe function", () => {
      let count = 0;
      const unsubscribe = emitter.on("widget:show", () => count++);

      emitter.emit("widget:show", undefined);
      expect(count).toBe(1);

      unsubscribe();
      emitter.emit("widget:show", undefined);
      expect(count).toBe(1); // Should not increase
    });

    it("should only remove the specific listener", () => {
      let count1 = 0;
      let count2 = 0;

      const unsub1 = emitter.on("widget:show", () => count1++);
      emitter.on("widget:show", () => count2++);

      unsub1();
      emitter.emit("widget:show", undefined);

      expect(count1).toBe(0);
      expect(count2).toBe(1);
    });
  });

  describe("once", () => {
    it("should only call listener once", () => {
      let count = 0;

      emitter.once("widget:show", () => count++);

      emitter.emit("widget:show", undefined);
      emitter.emit("widget:show", undefined);
      emitter.emit("widget:show", undefined);

      expect(count).toBe(1);
    });
  });

  describe("clear", () => {
    it("should remove all listeners for an event", () => {
      let count = 0;

      emitter.on("widget:show", () => count++);
      emitter.on("widget:show", () => count++);

      emitter.clear("widget:show");
      emitter.emit("widget:show", undefined);

      expect(count).toBe(0);
    });

    it("should not affect other events", () => {
      let showCount = 0;
      let hideCount = 0;

      emitter.on("widget:show", () => showCount++);
      emitter.on("widget:hide", () => hideCount++);

      emitter.clear("widget:show");
      emitter.emit("widget:show", undefined);
      emitter.emit("widget:hide", undefined);

      expect(showCount).toBe(0);
      expect(hideCount).toBe(1);
    });

    it("should clear all listeners when called without argument", () => {
      let showCount = 0;
      let hideCount = 0;

      emitter.on("widget:show", () => showCount++);
      emitter.on("widget:hide", () => hideCount++);

      emitter.clear();
      emitter.emit("widget:show", undefined);
      emitter.emit("widget:hide", undefined);

      expect(showCount).toBe(0);
      expect(hideCount).toBe(0);
    });
  });

  describe("listenerCount", () => {
    it("should return correct count of listeners", () => {
      expect(emitter.listenerCount("widget:show")).toBe(0);

      emitter.on("widget:show", () => {});
      expect(emitter.listenerCount("widget:show")).toBe(1);

      emitter.on("widget:show", () => {});
      expect(emitter.listenerCount("widget:show")).toBe(2);
    });

    it("should return 0 for events with no listeners", () => {
      expect(emitter.listenerCount("widget:hide")).toBe(0);
    });
  });

  describe("error events", () => {
    it("should emit error events with correct payload", () => {
      let receivedError: {
        code: string;
        message: string;
        source: string;
      } | null = null;

      emitter.on("error", (data) => {
        receivedError = data;
      });

      emitter.emit("error", {
        code: "transcription_timeout",
        message: "Transcription timed out",
        source: "timeout",
      });

      expect(receivedError).toEqual({
        code: "transcription_timeout",
        message: "Transcription timed out",
        source: "timeout",
      });
    });

    it("should support multiple error listeners", () => {
      let count = 0;

      emitter.on("error", () => count++);
      emitter.on("error", () => count++);

      emitter.emit("error", {
        code: "server_error",
        message: "Server error",
        source: "server",
      });

      expect(count).toBe(2);
    });

    it("should support different error sources", () => {
      const sources: string[] = [];

      emitter.on("error", (data) => {
        sources.push(data.source);
      });

      emitter.emit("error", {
        code: "init",
        message: "Init error",
        source: "init",
      });
      emitter.emit("error", {
        code: "conn",
        message: "Connection error",
        source: "connection",
      });
      emitter.emit("error", {
        code: "timeout",
        message: "Timeout error",
        source: "timeout",
      });
      emitter.emit("error", {
        code: "server",
        message: "Server error",
        source: "server",
      });

      expect(sources).toEqual(["init", "connection", "timeout", "server"]);
    });
  });

  describe("transcription events", () => {
    it("should emit transcription:complete events", () => {
      let receivedText: string | null = null;

      emitter.on("transcription:complete", (data) => {
        receivedText = data.text;
      });

      emitter.emit("transcription:complete", { text: "Hello world" });

      expect(receivedText).toBe("Hello world");
    });
  });

  describe("edit events", () => {
    it("should emit edit:complete events", () => {
      let received: { text: string; originalText: string } | null = null;

      emitter.on("edit:complete", (data) => {
        received = data;
      });

      emitter.emit("edit:complete", {
        text: "Edited text",
        originalText: "Original text",
      });

      expect(received).toEqual({
        text: "Edited text",
        originalText: "Original text",
      });
    });
  });
});
