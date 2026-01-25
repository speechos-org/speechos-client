/**
 * Tests for snippets store
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  snippetsStore,
  getSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  clearSnippets,
  getSnippetCount,
  isAtSnippetLimit,
  resetMemoryCache,
  type Snippet,
} from "./snippets-store.js";

describe("SnippetsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetMemoryCache();
    vi.clearAllMocks();
  });

  describe("addSnippet", () => {
    it("should add a valid snippet", () => {
      const result = addSnippet("my email", "john@example.com");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.snippet.trigger).toBe("my email");
        expect(result.snippet.expansion).toBe("john@example.com");
        expect(result.snippet.id).toBeDefined();
        expect(result.snippet.createdAt).toBeDefined();
      }
    });

    it("should trim whitespace from trigger and expansion", () => {
      const result = addSnippet("  my email  ", "  john@example.com  ");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.snippet.trigger).toBe("my email");
        expect(result.snippet.expansion).toBe("john@example.com");
      }
    });

    it("should generate unique IDs for each snippet", () => {
      const result1 = addSnippet("trigger1", "expansion1");
      const result2 = addSnippet("trigger2", "expansion2");

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.snippet.id).not.toBe(result2.snippet.id);
      }
    });

    it("should persist to localStorage", () => {
      addSnippet("my email", "john@example.com");

      const stored = localStorage.getItem("speechos_snippets");
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].trigger).toBe("my email");
    });

    it("should reject empty trigger", () => {
      const result = addSnippet("", "some expansion");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("trigger");
        expect(result.error.message).toBe("Trigger phrase is required.");
      }
    });

    it("should reject whitespace-only trigger", () => {
      const result = addSnippet("   ", "some expansion");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("trigger");
      }
    });

    it("should reject trigger exceeding 30 characters", () => {
      const longTrigger = "a".repeat(31);
      const result = addSnippet(longTrigger, "expansion");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("trigger");
        expect(result.error.message).toContain("30 characters");
      }
    });

    it("should reject empty expansion", () => {
      const result = addSnippet("my trigger", "");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("expansion");
        expect(result.error.message).toBe("Expansion text is required.");
      }
    });

    it("should reject expansion exceeding 300 characters", () => {
      const longExpansion = "a".repeat(301);
      const result = addSnippet("trigger", longExpansion);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("expansion");
        expect(result.error.message).toContain("300 characters");
      }
    });

    it("should reject duplicate trigger (case-insensitive)", () => {
      addSnippet("my email", "first@example.com");
      const result = addSnippet("MY EMAIL", "second@example.com");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("trigger");
        expect(result.error.message).toBe("This trigger phrase already exists.");
      }
    });

    it("should reject when at max limit (25)", () => {
      // Add 25 snippets
      for (let i = 0; i < 25; i++) {
        addSnippet(`trigger${i}`, `expansion${i}`);
      }

      const result = addSnippet("one more", "expansion");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("limit");
        expect(result.error.message).toContain("25 snippet limit");
      }
    });
  });

  describe("getSnippets", () => {
    it("should return empty array when no snippets exist", () => {
      const snippets = getSnippets();
      expect(snippets).toEqual([]);
    });

    it("should return snippets sorted by createdAt (newest first)", () => {
      addSnippet("first", "expansion1");
      addSnippet("second", "expansion2");
      addSnippet("third", "expansion3");

      const snippets = getSnippets();

      expect(snippets[0].trigger).toBe("third");
      expect(snippets[1].trigger).toBe("second");
      expect(snippets[2].trigger).toBe("first");
    });

    it("should return all saved snippets", () => {
      addSnippet("one", "exp1");
      addSnippet("two", "exp2");
      addSnippet("three", "exp3");

      const snippets = getSnippets();
      expect(snippets).toHaveLength(3);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("speechos_snippets", "invalid json{");

      const snippets = getSnippets();
      expect(snippets).toEqual([]);
    });
  });

  describe("updateSnippet", () => {
    it("should update an existing snippet", () => {
      const addResult = addSnippet("old trigger", "old expansion");
      expect(addResult.success).toBe(true);
      if (!addResult.success) return;

      const updateResult = updateSnippet(
        addResult.snippet.id,
        "new trigger",
        "new expansion"
      );

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.snippet.trigger).toBe("new trigger");
        expect(updateResult.snippet.expansion).toBe("new expansion");
      }
    });

    it("should allow keeping the same trigger when updating", () => {
      const addResult = addSnippet("my trigger", "old expansion");
      expect(addResult.success).toBe(true);
      if (!addResult.success) return;

      const updateResult = updateSnippet(
        addResult.snippet.id,
        "my trigger",
        "new expansion"
      );

      expect(updateResult.success).toBe(true);
    });

    it("should reject update if new trigger conflicts with another snippet", () => {
      addSnippet("existing", "expansion1");
      const addResult = addSnippet("another", "expansion2");
      expect(addResult.success).toBe(true);
      if (!addResult.success) return;

      const updateResult = updateSnippet(
        addResult.snippet.id,
        "existing",
        "new expansion"
      );

      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        expect(updateResult.error.message).toBe(
          "This trigger phrase already exists."
        );
      }
    });

    it("should return error for non-existent snippet ID", () => {
      const result = updateSnippet("fake-id", "trigger", "expansion");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Snippet not found.");
      }
    });
  });

  describe("deleteSnippet", () => {
    it("should delete a snippet by ID", () => {
      const result1 = addSnippet("keep", "expansion1");
      const result2 = addSnippet("delete", "expansion2");

      expect(result1.success && result2.success).toBe(true);
      if (!result1.success || !result2.success) return;

      deleteSnippet(result2.snippet.id);

      const snippets = getSnippets();
      expect(snippets).toHaveLength(1);
      expect(snippets[0].id).toBe(result1.snippet.id);
    });

    it("should do nothing if ID does not exist", () => {
      addSnippet("test", "expansion");

      deleteSnippet("nonexistent-id");

      const snippets = getSnippets();
      expect(snippets).toHaveLength(1);
    });
  });

  describe("clearSnippets", () => {
    it("should remove all snippets", () => {
      addSnippet("one", "exp1");
      addSnippet("two", "exp2");
      addSnippet("three", "exp3");

      clearSnippets();

      const snippets = getSnippets();
      expect(snippets).toEqual([]);
    });

    it("should remove localStorage key", () => {
      addSnippet("test", "expansion");

      clearSnippets();

      expect(localStorage.getItem("speechos_snippets")).toBeNull();
    });
  });

  describe("getSnippetCount", () => {
    it("should return current count and max", () => {
      addSnippet("one", "exp1");
      addSnippet("two", "exp2");

      const count = getSnippetCount();

      expect(count.current).toBe(2);
      expect(count.max).toBe(25);
    });

    it("should return 0 when no snippets", () => {
      const count = getSnippetCount();
      expect(count.current).toBe(0);
    });
  });

  describe("isAtSnippetLimit", () => {
    it("should return false when under limit", () => {
      addSnippet("one", "exp1");
      expect(isAtSnippetLimit()).toBe(false);
    });

    it("should return true when at limit", () => {
      for (let i = 0; i < 25; i++) {
        addSnippet(`trigger${i}`, `expansion${i}`);
      }
      expect(isAtSnippetLimit()).toBe(true);
    });
  });

  describe("snippetsStore object", () => {
    it("should export all functions and constants", () => {
      expect(snippetsStore.getSnippets).toBe(getSnippets);
      expect(snippetsStore.addSnippet).toBe(addSnippet);
      expect(snippetsStore.updateSnippet).toBe(updateSnippet);
      expect(snippetsStore.deleteSnippet).toBe(deleteSnippet);
      expect(snippetsStore.clearSnippets).toBe(clearSnippets);
      expect(snippetsStore.getSnippetCount).toBe(getSnippetCount);
      expect(snippetsStore.isAtSnippetLimit).toBe(isAtSnippetLimit);
      expect(snippetsStore.MAX_SNIPPETS).toBe(25);
      expect(snippetsStore.MAX_TRIGGER_LENGTH).toBe(30);
      expect(snippetsStore.MAX_EXPANSION_LENGTH).toBe(300);
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage.setItem failure gracefully", () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      // Should not throw, but snippet won't be persisted
      expect(() => addSnippet("test", "expansion")).not.toThrow();

      setItemSpy.mockRestore();
    });

    it("should handle localStorage.removeItem failure gracefully", () => {
      const removeItemSpy = vi
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("Error");
        });

      expect(() => clearSnippets()).not.toThrow();

      removeItemSpy.mockRestore();
    });
  });
});
