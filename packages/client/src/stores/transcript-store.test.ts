/**
 * Tests for transcript store
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  transcriptStore,
  getTranscripts,
  saveTranscript,
  clearTranscripts,
  deleteTranscript,
  resetMemoryCache,
  type TranscriptEntry,
} from "./transcript-store.js";

describe("TranscriptStore", () => {
  beforeEach(() => {
    // Clear localStorage and memory cache before each test
    localStorage.clear();
    resetMemoryCache();
    vi.clearAllMocks();
  });

  describe("saveTranscript", () => {
    it("should save a dictate transcript", () => {
      const entry = saveTranscript("Hello world", "dictate");

      expect(entry.text).toBe("Hello world");
      expect(entry.action).toBe("dictate");
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.originalText).toBeUndefined();
    });

    it("should save an edit transcript with original text", () => {
      const entry = saveTranscript("Edited text", "edit", "Original text");

      expect(entry.text).toBe("Edited text");
      expect(entry.action).toBe("edit");
      expect(entry.originalText).toBe("Original text");
    });

    it("should generate unique IDs for each entry", () => {
      const entry1 = saveTranscript("First", "dictate");
      const entry2 = saveTranscript("Second", "dictate");

      expect(entry1.id).not.toBe(entry2.id);
    });

    it("should persist to localStorage", () => {
      saveTranscript("Test", "dictate");

      const stored = localStorage.getItem("speechos_transcripts");
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].text).toBe("Test");
    });
  });

  describe("getTranscripts", () => {
    it("should return empty array when no transcripts exist", () => {
      const transcripts = getTranscripts();
      expect(transcripts).toEqual([]);
    });

    it("should return transcripts sorted by timestamp (newest first)", () => {
      // Save with slight delay simulation by manipulating timestamps
      const entry1 = saveTranscript("First", "dictate");
      const entry2 = saveTranscript("Second", "dictate");
      const entry3 = saveTranscript("Third", "dictate");

      const transcripts = getTranscripts();

      // Most recent should be first
      expect(transcripts[0].text).toBe("Third");
      expect(transcripts[1].text).toBe("Second");
      expect(transcripts[2].text).toBe("First");
    });

    it("should return all saved transcripts", () => {
      saveTranscript("One", "dictate");
      saveTranscript("Two", "edit", "Original");
      saveTranscript("Three", "dictate");

      const transcripts = getTranscripts();
      expect(transcripts).toHaveLength(3);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("speechos_transcripts", "invalid json{");

      const transcripts = getTranscripts();
      expect(transcripts).toEqual([]);
    });
  });

  describe("deleteTranscript", () => {
    it("should delete a transcript by ID", () => {
      const entry1 = saveTranscript("Keep this", "dictate");
      const entry2 = saveTranscript("Delete this", "dictate");

      deleteTranscript(entry2.id);

      const transcripts = getTranscripts();
      expect(transcripts).toHaveLength(1);
      expect(transcripts[0].id).toBe(entry1.id);
    });

    it("should do nothing if ID does not exist", () => {
      saveTranscript("Test", "dictate");

      deleteTranscript("nonexistent-id");

      const transcripts = getTranscripts();
      expect(transcripts).toHaveLength(1);
    });
  });

  describe("clearTranscripts", () => {
    it("should remove all transcripts", () => {
      saveTranscript("One", "dictate");
      saveTranscript("Two", "dictate");
      saveTranscript("Three", "dictate");

      clearTranscripts();

      const transcripts = getTranscripts();
      expect(transcripts).toEqual([]);
    });

    it("should remove localStorage key", () => {
      saveTranscript("Test", "dictate");

      clearTranscripts();

      expect(localStorage.getItem("speechos_transcripts")).toBeNull();
    });
  });

  describe("max entries pruning", () => {
    it("should prune oldest entries when exceeding max (50)", () => {
      // Save 55 entries
      for (let i = 0; i < 55; i++) {
        saveTranscript(`Entry ${i}`, "dictate");
      }

      const transcripts = getTranscripts();

      // Should only keep 50
      expect(transcripts).toHaveLength(50);

      // Most recent should be Entry 54
      expect(transcripts[0].text).toBe("Entry 54");

      // Oldest kept should be Entry 5 (0-4 were pruned)
      expect(transcripts[49].text).toBe("Entry 5");
    });
  });

  describe("transcriptStore object", () => {
    it("should export all functions", () => {
      expect(transcriptStore.getTranscripts).toBe(getTranscripts);
      expect(transcriptStore.saveTranscript).toBe(saveTranscript);
      expect(transcriptStore.clearTranscripts).toBe(clearTranscripts);
      expect(transcriptStore.deleteTranscript).toBe(deleteTranscript);
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage.setItem failure gracefully", () => {
      // Mock localStorage.setItem to throw
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      // Should not throw
      expect(() => saveTranscript("Test", "dictate")).not.toThrow();

      setItemSpy.mockRestore();
    });

    it("should handle localStorage.removeItem failure gracefully", () => {
      const removeItemSpy = vi
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("Error");
        });

      // Should not throw
      expect(() => clearTranscripts()).not.toThrow();

      removeItemSpy.mockRestore();
    });
  });

  describe("memory cache behavior (server sync)", () => {
    it("setTranscripts should populate memory cache", () => {
      const serverTranscripts = [
        { id: "server-1", text: "Hello", timestamp: 1000, action: "dictate" as const },
        { id: "server-2", text: "World", timestamp: 2000, action: "dictate" as const },
      ];

      transcriptStore.setTranscripts(serverTranscripts);

      const result = getTranscripts();
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("World"); // Newer first
      expect(result[1].text).toBe("Hello");
    });

    it("memory cache takes precedence over localStorage", () => {
      // First, put something in localStorage
      localStorage.setItem(
        "speechos_transcripts",
        JSON.stringify([{ id: "local-1", text: "Local", timestamp: 500, action: "dictate" }])
      );

      // Then set server data via setTranscripts
      const serverTranscripts = [
        { id: "server-1", text: "Server", timestamp: 1000, action: "dictate" as const },
      ];
      transcriptStore.setTranscripts(serverTranscripts);

      // getTranscripts should return server data, not localStorage
      const result = getTranscripts();
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Server");
      expect(result[0].id).toBe("server-1");
    });

    it("saveTranscript updates memory cache when set", () => {
      // Set initial server data
      transcriptStore.setTranscripts([
        { id: "server-1", text: "Server", timestamp: 1000, action: "dictate" as const },
      ]);

      // Save a new transcript
      saveTranscript("New entry", "dictate");

      // Should have both transcripts
      const result = getTranscripts();
      expect(result).toHaveLength(2);
      expect(result.some((t) => t.text === "Server")).toBe(true);
      expect(result.some((t) => t.text === "New entry")).toBe(true);
    });

    it("clearTranscripts clears memory cache", () => {
      transcriptStore.setTranscripts([
        { id: "server-1", text: "Server", timestamp: 1000, action: "dictate" as const },
      ]);

      clearTranscripts();

      expect(getTranscripts()).toHaveLength(0);
    });

    it("deleteTranscript updates memory cache", () => {
      transcriptStore.setTranscripts([
        { id: "server-1", text: "Entry1", timestamp: 1000, action: "dictate" as const },
        { id: "server-2", text: "Entry2", timestamp: 2000, action: "dictate" as const },
      ]);

      deleteTranscript("server-1");

      const result = getTranscripts();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("server-2");
    });
  });
});
