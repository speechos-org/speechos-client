/**
 * Tests for vocabulary store
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  vocabularyStore,
  getVocabulary,
  addTerm,
  deleteTerm,
  clearVocabulary,
  getVocabularyCount,
  isAtVocabularyLimit,
  resetMemoryCache,
  type VocabularyTerm,
} from "./vocabulary-store.js";

describe("VocabularyStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetMemoryCache();
    vi.clearAllMocks();
  });

  describe("addTerm", () => {
    it("should add a valid term", () => {
      const result = addTerm("Kubernetes");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.term.term).toBe("Kubernetes");
        expect(result.term.id).toBeDefined();
        expect(result.term.createdAt).toBeDefined();
      }
    });

    it("should trim whitespace from term", () => {
      const result = addTerm("  Kubernetes  ");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.term.term).toBe("Kubernetes");
      }
    });

    it("should generate unique IDs for each term", () => {
      const result1 = addTerm("term1");
      const result2 = addTerm("term2");

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.term.id).not.toBe(result2.term.id);
      }
    });

    it("should persist to localStorage", () => {
      addTerm("Kubernetes");

      const stored = localStorage.getItem("speechos_vocabulary");
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].term).toBe("Kubernetes");
    });

    it("should reject empty term", () => {
      const result = addTerm("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("term");
        expect(result.error.message).toBe("Term is required.");
      }
    });

    it("should reject whitespace-only term", () => {
      const result = addTerm("   ");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("term");
      }
    });

    it("should reject term exceeding 50 characters", () => {
      const longTerm = "a".repeat(51);
      const result = addTerm(longTerm);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("term");
        expect(result.error.message).toContain("50 characters");
      }
    });

    it("should accept term at exactly 50 characters", () => {
      const exactTerm = "a".repeat(50);
      const result = addTerm(exactTerm);

      expect(result.success).toBe(true);
    });

    it("should reject duplicate term (case-insensitive)", () => {
      addTerm("Kubernetes");
      const result = addTerm("KUBERNETES");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("term");
        expect(result.error.message).toBe(
          "This term is already in your vocabulary."
        );
      }
    });

    it("should reject when at max limit (50)", () => {
      // Add 50 terms
      for (let i = 0; i < 50; i++) {
        addTerm(`term${i}`);
      }

      const result = addTerm("one more");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe("limit");
        expect(result.error.message).toContain("50 term limit");
      }
    });
  });

  describe("getVocabulary", () => {
    it("should return empty array when no terms exist", () => {
      const vocabulary = getVocabulary();
      expect(vocabulary).toEqual([]);
    });

    it("should return terms sorted by createdAt (newest first)", () => {
      addTerm("first");
      addTerm("second");
      addTerm("third");

      const vocabulary = getVocabulary();

      expect(vocabulary[0].term).toBe("third");
      expect(vocabulary[1].term).toBe("second");
      expect(vocabulary[2].term).toBe("first");
    });

    it("should return all saved terms", () => {
      addTerm("one");
      addTerm("two");
      addTerm("three");

      const vocabulary = getVocabulary();
      expect(vocabulary).toHaveLength(3);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("speechos_vocabulary", "invalid json{");

      const vocabulary = getVocabulary();
      expect(vocabulary).toEqual([]);
    });
  });

  describe("deleteTerm", () => {
    it("should delete a term by ID", () => {
      const result1 = addTerm("keep");
      const result2 = addTerm("delete");

      expect(result1.success && result2.success).toBe(true);
      if (!result1.success || !result2.success) return;

      deleteTerm(result2.term.id);

      const vocabulary = getVocabulary();
      expect(vocabulary).toHaveLength(1);
      expect(vocabulary[0].id).toBe(result1.term.id);
    });

    it("should do nothing if ID does not exist", () => {
      addTerm("test");

      deleteTerm("nonexistent-id");

      const vocabulary = getVocabulary();
      expect(vocabulary).toHaveLength(1);
    });
  });

  describe("clearVocabulary", () => {
    it("should remove all terms", () => {
      addTerm("one");
      addTerm("two");
      addTerm("three");

      clearVocabulary();

      const vocabulary = getVocabulary();
      expect(vocabulary).toEqual([]);
    });

    it("should remove localStorage key", () => {
      addTerm("test");

      clearVocabulary();

      expect(localStorage.getItem("speechos_vocabulary")).toBeNull();
    });
  });

  describe("getVocabularyCount", () => {
    it("should return current count and max", () => {
      addTerm("one");
      addTerm("two");

      const count = getVocabularyCount();

      expect(count.current).toBe(2);
      expect(count.max).toBe(50);
    });

    it("should return 0 when no terms", () => {
      const count = getVocabularyCount();
      expect(count.current).toBe(0);
    });
  });

  describe("isAtVocabularyLimit", () => {
    it("should return false when under limit", () => {
      addTerm("one");
      expect(isAtVocabularyLimit()).toBe(false);
    });

    it("should return true when at limit", () => {
      for (let i = 0; i < 50; i++) {
        addTerm(`term${i}`);
      }
      expect(isAtVocabularyLimit()).toBe(true);
    });
  });

  describe("vocabularyStore object", () => {
    it("should export all functions and constants", () => {
      expect(vocabularyStore.getVocabulary).toBe(getVocabulary);
      expect(vocabularyStore.addTerm).toBe(addTerm);
      expect(vocabularyStore.deleteTerm).toBe(deleteTerm);
      expect(vocabularyStore.clearVocabulary).toBe(clearVocabulary);
      expect(vocabularyStore.getVocabularyCount).toBe(getVocabularyCount);
      expect(vocabularyStore.isAtVocabularyLimit).toBe(isAtVocabularyLimit);
      expect(vocabularyStore.MAX_TERMS).toBe(50);
      expect(vocabularyStore.MAX_TERM_LENGTH).toBe(50);
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage.setItem failure gracefully", () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      // Should not throw, but term won't be persisted
      expect(() => addTerm("test")).not.toThrow();

      setItemSpy.mockRestore();
    });

    it("should handle localStorage.removeItem failure gracefully", () => {
      const removeItemSpy = vi
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("Error");
        });

      expect(() => clearVocabulary()).not.toThrow();

      removeItemSpy.mockRestore();
    });
  });

  describe("real-world vocabulary examples", () => {
    it("should handle medical terms", () => {
      const terms = [
        "myocardial infarction",
        "pneumothorax",
        "endoscopy",
        "angioplasty",
      ];

      terms.forEach((term) => {
        const result = addTerm(term);
        expect(result.success).toBe(true);
      });

      expect(getVocabulary()).toHaveLength(4);
    });

    it("should handle technical terms", () => {
      const terms = ["Kubernetes", "GraphQL", "PostgreSQL", "WebSocket"];

      terms.forEach((term) => {
        const result = addTerm(term);
        expect(result.success).toBe(true);
      });

      expect(getVocabulary()).toHaveLength(4);
    });

    it("should handle legal terms", () => {
      const terms = ["habeas corpus", "amicus curiae", "voir dire", "subpoena"];

      terms.forEach((term) => {
        const result = addTerm(term);
        expect(result.success).toBe(true);
      });

      expect(getVocabulary()).toHaveLength(4);
    });
  });

  describe("memory cache behavior (server sync)", () => {
    it("setVocabulary should populate memory cache", () => {
      const serverTerms = [
        { id: "server-1", term: "ServerTerm1", createdAt: 1000 },
        { id: "server-2", term: "ServerTerm2", createdAt: 2000 },
      ];

      vocabularyStore.setVocabulary(serverTerms);

      const result = getVocabulary();
      expect(result).toHaveLength(2);
      expect(result[0].term).toBe("ServerTerm2"); // Newer first
      expect(result[1].term).toBe("ServerTerm1");
    });

    it("memory cache takes precedence over localStorage", () => {
      // First, put something in localStorage
      localStorage.setItem(
        "speechos_vocabulary",
        JSON.stringify([{ id: "local-1", term: "LocalTerm", createdAt: 500 }])
      );

      // Then set server data via setVocabulary
      const serverTerms = [
        { id: "server-1", term: "ServerTerm", createdAt: 1000 },
      ];
      vocabularyStore.setVocabulary(serverTerms);

      // getVocabulary should return server data, not localStorage
      const result = getVocabulary();
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe("ServerTerm");
      expect(result[0].id).toBe("server-1");
    });

    it("addTerm updates memory cache when set", () => {
      // Set initial server data
      vocabularyStore.setVocabulary([
        { id: "server-1", term: "ServerTerm", createdAt: 1000 },
      ]);

      // Add a new term
      addTerm("NewTerm");

      // Should have both terms
      const result = getVocabulary();
      expect(result).toHaveLength(2);
      expect(result.some((t) => t.term === "ServerTerm")).toBe(true);
      expect(result.some((t) => t.term === "NewTerm")).toBe(true);
    });

    it("clearVocabulary clears memory cache", () => {
      vocabularyStore.setVocabulary([
        { id: "server-1", term: "ServerTerm", createdAt: 1000 },
      ]);

      clearVocabulary();

      expect(getVocabulary()).toHaveLength(0);
    });

    it("deleteTerm updates memory cache", () => {
      vocabularyStore.setVocabulary([
        { id: "server-1", term: "Term1", createdAt: 1000 },
        { id: "server-2", term: "Term2", createdAt: 2000 },
      ]);

      deleteTerm("server-1");

      const result = getVocabulary();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("server-2");
    });
  });
});
