/**
 * Tests for dictation output modal component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("SpeechOSDictationOutputModal", () => {
  let modal: HTMLElement;

  beforeEach(async () => {
    // Dynamically import to ensure custom element is registered
    await import("./dictation-output-modal.js");

    modal = document.createElement("speechos-dictation-output-modal");
    document.body.appendChild(modal);
    await (modal as any).updateComplete;
  });

  afterEach(() => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    document.body.innerHTML = "";
  });

  describe("initialization", () => {
    it("should create the component", () => {
      expect(modal).toBeTruthy();
      expect(modal.tagName.toLowerCase()).toBe("speechos-dictation-output-modal");
    });

    it("should have open property default to false", () => {
      expect((modal as any).open).toBe(false);
    });

    it("should have text property default to empty string", () => {
      expect((modal as any).text).toBe("");
    });
  });

  describe("open/close behavior", () => {
    it("should show overlay when open is true", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const overlay = modal.shadowRoot?.querySelector(".modal-overlay");
      expect(overlay?.classList.contains("open")).toBe(true);
    });

    it("should hide overlay when open is false", async () => {
      (modal as any).open = false;
      await (modal as any).updateComplete;

      const overlay = modal.shadowRoot?.querySelector(".modal-overlay");
      expect(overlay?.classList.contains("open")).toBe(false);
    });

    it("should dispatch modal-close event when close button is clicked", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const closeListener = vi.fn();
      modal.addEventListener("modal-close", closeListener);

      const closeButton = modal.shadowRoot?.querySelector(".close-button") as HTMLElement;
      closeButton?.click();

      expect(closeListener).toHaveBeenCalled();
    });

    it("should dispatch modal-close event when Done button is clicked", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const closeListener = vi.fn();
      modal.addEventListener("modal-close", closeListener);

      const doneButton = modal.shadowRoot?.querySelector(".btn-secondary") as HTMLElement;
      doneButton?.click();

      expect(closeListener).toHaveBeenCalled();
    });

    it("should dispatch modal-close event when overlay is clicked", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const closeListener = vi.fn();
      modal.addEventListener("modal-close", closeListener);

      const overlay = modal.shadowRoot?.querySelector(".modal-overlay") as HTMLElement;
      // Simulate click on overlay (not on modal card)
      overlay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(closeListener).toHaveBeenCalled();
    });
  });

  describe("text display", () => {
    it("should display the text property", async () => {
      (modal as any).text = "Hello, world!";
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const textDisplay = modal.shadowRoot?.querySelector(".text-display");
      expect(textDisplay?.textContent).toBe("Hello, world!");
    });

    it("should update text when property changes", async () => {
      (modal as any).text = "Initial text";
      await (modal as any).updateComplete;

      (modal as any).text = "Updated text";
      await (modal as any).updateComplete;

      const textDisplay = modal.shadowRoot?.querySelector(".text-display");
      expect(textDisplay?.textContent).toBe("Updated text");
    });
  });

  describe("copy functionality", () => {
    it("should have a copy button", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const copyButton = modal.shadowRoot?.querySelector(".btn-primary, .btn-success");
      expect(copyButton).toBeTruthy();
    });

    it("should have a copy button that is clickable", async () => {
      (modal as any).text = "Text to copy";
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const copyButton = modal.shadowRoot?.querySelector(".btn-primary") as HTMLElement;
      expect(copyButton).toBeTruthy();
      // Just verify the button exists and can be clicked without throwing
      expect(() => copyButton?.click()).not.toThrow();
    });
  });

  describe("modal title", () => {
    it("should display 'Dictation Complete' title", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const title = modal.shadowRoot?.querySelector(".modal-title");
      expect(title?.textContent).toBe("Dictation Complete");
    });
  });
});
