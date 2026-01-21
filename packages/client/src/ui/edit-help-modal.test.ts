/**
 * Tests for edit help modal component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("SpeechOSEditHelpModal", () => {
  let modal: HTMLElement;

  beforeEach(async () => {
    // Dynamically import to ensure custom element is registered
    await import("./edit-help-modal.js");

    modal = document.createElement("speechos-edit-help-modal");
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
      expect(modal.tagName.toLowerCase()).toBe("speechos-edit-help-modal");
    });

    it("should have open property default to false", () => {
      expect((modal as any).open).toBe(false);
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

    it("should dispatch modal-close event when 'Got it' button is clicked", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const closeListener = vi.fn();
      modal.addEventListener("modal-close", closeListener);

      const gotItButton = modal.shadowRoot?.querySelector(".btn-primary") as HTMLElement;
      gotItButton?.click();

      expect(closeListener).toHaveBeenCalled();
    });

    it("should dispatch modal-close event when overlay is clicked", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const closeListener = vi.fn();
      modal.addEventListener("modal-close", closeListener);

      const overlay = modal.shadowRoot?.querySelector(".modal-overlay") as HTMLElement;
      overlay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(closeListener).toHaveBeenCalled();
    });
  });

  describe("content", () => {
    it("should display 'How to Use Edit' title", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const title = modal.shadowRoot?.querySelector(".modal-title");
      expect(title?.textContent).toBe("How to Use Edit");
    });

    it("should display instruction steps", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const instructionItems = modal.shadowRoot?.querySelectorAll(".instruction-item");
      expect(instructionItems?.length).toBe(3);
    });

    it("should have numbered steps", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const stepNumbers = modal.shadowRoot?.querySelectorAll(".instruction-number");
      expect(stepNumbers?.length).toBe(3);
      expect(stepNumbers?.[0]?.textContent).toBe("1");
      expect(stepNumbers?.[1]?.textContent).toBe("2");
      expect(stepNumbers?.[2]?.textContent).toBe("3");
    });

    it("should have a 'Got it' button", async () => {
      (modal as any).open = true;
      await (modal as any).updateComplete;

      const button = modal.shadowRoot?.querySelector(".btn-primary");
      expect(button?.textContent?.trim()).toBe("Got it");
    });
  });
});
